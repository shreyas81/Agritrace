const { ethers, upgrades } = require('hardhat');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

async function main() {
  const [deployer, proposer, executor] = await ethers.getSigners();

  // Deploy TimelockController via OpenZeppelin library (hardhat environment needs @openzeppelin/contracts)
  const Timelock = await ethers.getContractFactory('TimelockController');
  const minDelay = 3600; // 1 hour for testing; use longer for production
  const proposers = [proposer.address];
  const executors = [executor.address];
  const timelock = await Timelock.deploy(minDelay, proposers, executors, deployer.address);
  await timelock.deployed();
  console.log('TimelockController deployed at:', timelock.address);

  // Example: set Timelock as admin in your AgriEscrow (if deployed)
  // const escrowAddr = 'REPLACE_WITH_ESCROW_ADDRESS';
  // const Escrow = await ethers.getContractAt('AgriEscrowUpgradeable', escrowAddr);
  // await Escrow.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE")), timelock.address);
}

main().catch(e => { console.error(e); process.exit(1); });
