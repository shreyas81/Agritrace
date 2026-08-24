Detailed file descriptions (AgriTrace MVP v2)
============================================
Root:
- README.md: Overview of the package.
- DETAILED_FILE_DESCRIPTIONS.md: This file (detailed explanations).

hardhat/:
- package.json: Node dependencies for the Hardhat project (includes OpenZeppelin upgradeable and upgrades plugin).
- hardhat.config.js: Hardhat config for solidity compiler and plugin registration.
- contracts/AgriEscrowUpgradeable.sol: Main upgradeable escrow contract (UUPS pattern, AccessControl, Pausable, ReentrancyGuard, EIP712 verification).
- contracts/ERC20Test.sol: Test ERC20 token with mint() for tests.
- contracts/ChainlinkVerifierExample.sol: Example of an oracle-driven verification contract outline (illustrative; requires Chainlink node & adapter to use in production).
- scripts/deploy_upgradeable.js: Deploy upgradeable proxy for AgriEscrow using @openzeppelin/hardhat-upgrades.
- scripts/deploy_timelock.js: Deploy TimelockController and set it as admin for the AgriEscrow contract.
- scripts/cli/createBatch.js, fundEscrow.js, submitVerification.js: Simple CLI scripts to perform common actions using ethers.js.
- scripts/sign_eip712.js: Example script to produce EIP-712 signature for verifier attestation.
- test/escrow_upgradeable.test.js: Comprehensive tests covering create/fund/verify/refund/dispute flows and EIP-712 path.

frontend/:
- package.json: React dependencies.
- src/App.js: Expanded UI with forms to createBatch, fundEscrow, and submitVerification (EIP-712 path or direct verifier).
- src/config.js: Placeholders for CONTRACT_ADDRESS and ABI - update after deployment.
- src/components/*: UI components for forms and status display.

INSTALL.md:
- Step-by-step instructions for installing dependencies, running tests, deploying locally, and running frontend.

Note: Running `npm install` requires internet access. This environment may not have Node.js/npm available or network access; if so, unit tests cannot be executed here. Full instructions are included so you can run them locally or in your CI environment.
