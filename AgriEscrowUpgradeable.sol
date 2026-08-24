// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract AgriEscrowUpgradeable is Initializable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, EIP712Upgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using ECDSAUpgradeable for bytes32;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    enum BatchStatus { NONE, CREATED, FUNDED, VERIFIED, PAID, REFUNDED, DISPUTED }

    struct Batch {
        bytes32 id;
        address farmer;
        address buyer;
        address token;
        uint256 amount;
        string ipfsCID;
        uint256 createdAt;
        uint256 deliveryDeadline;
        bytes32 conditionsHash;
        BatchStatus status;
        address lastVerifier;
    }

    mapping(bytes32 => Batch) public batches;

    uint256 public platformFeeBps; // basis points
    address public treasury;

    // EIP-712 type hash for the Verification struct
    bytes32 private constant VERIFICATION_TYPEHASH = keccak256("Verification(bytes32 batchId,bool pass,string detailsCID)");

    event BatchCreated(bytes32 indexed batchId, address indexed buyer, address indexed farmer, uint256 amount);
    event EscrowFunded(bytes32 indexed batchId, uint256 amount);
    event VerificationSubmitted(bytes32 indexed batchId, address indexed verifier, bool pass, string detailsCID);
    event PaymentReleased(bytes32 indexed batchId, address to, uint256 amount);
    event DisputeRaised(bytes32 indexed batchId, address raisedBy, string reasonCID);
    event DisputeResolved(bytes32 indexed batchId, address resolver, string resolutionCID);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address admin, address _treasury, uint256 _platformFeeBps) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __EIP712_init("AgriEscrow", "1");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        treasury = _treasury;
        platformFeeBps = _platformFeeBps;
    }

    function _authorizeUpgrade(address) internal override onlyRole(ADMIN_ROLE) {}

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    function createBatch(
        bytes32 batchId,
        address farmer,
        address token,
        uint256 amount,
        string calldata ipfsCID,
        uint256 deliveryDeadline,
        bytes32 conditionsHash
    ) external whenNotPaused nonReentrant {
        require(batches[batchId].status == BatchStatus.NONE, "Batch already exists");
        batches[batchId] = Batch({
            id: batchId,
            farmer: farmer,
            buyer: msg.sender,
            token: token,
            amount: amount,
            ipfsCID: ipfsCID,
            createdAt: block.timestamp,
            deliveryDeadline: deliveryDeadline,
            conditionsHash: conditionsHash,
            status: BatchStatus.CREATED,
            lastVerifier: address(0)
        });
        emit BatchCreated(batchId, msg.sender, farmer, amount);
    }

    function fundEscrow(bytes32 batchId) external whenNotPaused nonReentrant {
        Batch storage b = batches[batchId];
        require(b.status == BatchStatus.CREATED, "Batch not in CREATED state");
        require(b.amount > 0, "Zero amount");
        IERC20Upgradeable(b.token).safeTransferFrom(msg.sender, address(this), b.amount);
        b.status = BatchStatus.FUNDED;
        emit EscrowFunded(batchId, b.amount);
    }

    // Direct verifier call or EIP-712 signed verification
    function submitVerification(bytes32 batchId, bool pass, string calldata detailsCID, bytes calldata signature) external whenNotPaused nonReentrant {
        Batch storage b = batches[batchId];
        require(b.status == BatchStatus.FUNDED, "Batch must be FUNDED");

        address signer;
        if (hasRole(VERIFIER_ROLE, msg.sender)) {
            signer = msg.sender;
        } else {
            // Verify EIP-712 signature
            bytes32 structHash = keccak256(abi.encode(VERIFICATION_TYPEHASH, batchId, pass, keccak256(bytes(detailsCID))));
            bytes32 digest = _hashTypedDataV4(structHash);
            signer = ECDSAUpgradeable.recover(digest, signature);
            require(hasRole(VERIFIER_ROLE, signer), "Invalid verifier signature");
        }

        b.lastVerifier = signer;
        emit VerificationSubmitted(batchId, signer, pass, detailsCID);

        if (pass) {
            b.status = BatchStatus.VERIFIED;
            _releasePayment(batchId);
        } else {
            b.status = BatchStatus.DISPUTED;
        }
    }

    function _releasePayment(bytes32 batchId) internal {
        Batch storage b = batches[batchId];
        require(b.status == BatchStatus.VERIFIED, "Batch not verified");
        uint256 fee = (b.amount * platformFeeBps) / 10000;
        uint256 payout = b.amount - fee;
        IERC20Upgradeable(b.token).safeTransfer(b.farmer, payout);
        if (fee > 0 && treasury != address(0)) {
            IERC20Upgradeable(b.token).safeTransfer(treasury, fee);
        }
        b.status = BatchStatus.PAID;
        emit PaymentReleased(batchId, b.farmer, payout);
    }

    function raiseDispute(bytes32 batchId, string calldata reasonCID) external whenNotPaused {
        Batch storage b = batches[batchId];
        require(b.status == BatchStatus.FUNDED || b.status == BatchStatus.VERIFIED, "Cannot dispute");
        require(msg.sender == b.buyer || msg.sender == b.farmer, "Not authorized to dispute");
        b.status = BatchStatus.DISPUTED;
        emit DisputeRaised(batchId, msg.sender, reasonCID);
    }

    function resolveDispute(bytes32 batchId, address recipient, uint256 amountToRecipient, string calldata resolutionCID) external onlyRole(ARBITRATOR_ROLE) whenNotPaused nonReentrant {
        Batch storage b = batches[batchId];
        require(b.status == BatchStatus.DISPUTED, "Not in dispute");
        require(amountToRecipient <= b.amount, "Invalid amount");
        uint256 fee = (amountToRecipient * platformFeeBps) / 10000;
        uint256 payout = amountToRecipient - fee;
        IERC20Upgradeable(b.token).safeTransfer(recipient, payout);
        if (fee > 0 && treasury != address(0)) {
            IERC20Upgradeable(b.token).safeTransfer(treasury, fee);
        }
        uint256 remainder = b.amount - amountToRecipient;
        if (remainder > 0) {
            address other = (recipient == b.farmer) ? b.buyer : b.farmer;
            IERC20Upgradeable(b.token).safeTransfer(other, remainder);
        }
        b.status = BatchStatus.PAID;
        emit DisputeResolved(batchId, msg.sender, resolutionCID);
    }

    function refund(bytes32 batchId) external whenNotPaused nonReentrant {
        Batch storage b = batches[batchId];
        require(b.status == BatchStatus.FUNDED, "Not refundable");
        require(block.timestamp > b.deliveryDeadline, "Delivery deadline not reached");
        IERC20Upgradeable(b.token).safeTransfer(b.buyer, b.amount);
        b.status = BatchStatus.REFUNDED;
    }

    // Admin functions
    function setPlatformFeeBps(uint256 bps) external onlyAdmin {
        platformFeeBps = bps;
    }

    function setTreasury(address _treasury) external onlyAdmin {
        treasury = _treasury;
    }

    function grantVerifier(address verifier) external onlyAdmin {
        _grantRole(VERIFIER_ROLE, verifier);
    }

    function revokeVerifier(address verifier) external onlyAdmin {
        _revokeRole(VERIFIER_ROLE, verifier);
    }

    function grantArbitrator(address arb) external onlyAdmin {
        _grantRole(ARBITRATOR_ROLE, arb);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    // Views
    function getBatch(bytes32 batchId) external view returns (Batch memory) {
        return batches[batchId];
    }
}
