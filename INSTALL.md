AgriTrace MVP v2 - Install & Run (local)
=======================================

Prerequisites:
- Node.js v18+ and npm
- Optional: yarn
- MetaMask for frontend testing
- (Optional) An RPC provider for testnet (Alchemy/Infura) and private key for deployer

Steps:
1) Install Hardhat dependencies:
   cd hardhat
   npm install

2) Compile & Run tests locally:
   npx hardhat compile
   npx hardhat test

3) Start local Hardhat node and deploy upgradeable contracts:
   # Terminal A
   npx hardhat node
   # Terminal B
   npx hardhat run --network localhost scripts/deploy_upgradeable.js

4) Optionally deploy Timelock controller and configure admins:
   npx hardhat run --network localhost scripts/deploy_timelock.js

5) Frontend:
   cd frontend
   npm install
   # Update src/config.js with deployed contract address and ABI
   npm start

Notes:
- If you deploy to a public testnet (Polygon Mumbai / Sepolia), configure RPC URLs and PRIVATE_KEY in environment variables and update hardhat.config.js accordingly.
- For production admin governance, use a multisig (Gnosis Safe) and a Timelock for critical changes.
