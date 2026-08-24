// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
  ChainlinkVerifierExample.sol

  This is an illustrative example of how an off-chain oracle could write verification results
  to the AgriEscrow contract. In a production setup, you'd run a Chainlink External Adapter
  or a node operator that listens to on-chain events, performs off-chain checks (e.g., IoT logs),
  and then calls a function on the escrow contract or a dedicated oracle-bridge contract.

  For simplicity we show a contract that could be called by a trusted oracle (owner) to push
  verification results; in production replace 'onlyOwner' with ChainlinkRequest fulfillment logic.
*/

import "@openzeppelin/contracts/access/Ownable.sol";

interface IAgriEscrow {
    function submitVerification(bytes32 batchId, bool pass, string calldata detailsCID, bytes calldata signature) external;
}

contract ChainlinkVerifierExample is Ownable {
    IAgriEscrow public escrow;

    constructor(address escrowAddr) {
        escrow = IAgriEscrow(escrowAddr);
    }

    // Oracle node would call this after fetching IoT logs and verifying conditions.
    function fulfillVerification(bytes32 batchId, bool pass, string calldata detailsCID) external onlyOwner {
        // The oracle is trusted (owner) and can call submitVerification directly as a verifier would
        // In AgriEscrow, only addresses with VERIFIER_ROLE can call submitVerification directly.
        // So you would add this contract address as a verifier in AgriEscrow via grantVerifier(contractAddress).
        escrow.submitVerification(batchId, pass, detailsCID, "0x"); // signature empty for direct call
    }
}
