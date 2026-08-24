const { ethers, upgrades } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with', deployer.address);

  const Agri = await ethers.getContractFactory('AgriEscrowUpgradeable');
  const admin = deployer.address;
  const treasury = deployer.address;
  const feeBps = 100;
  const instance = await upgrades.deployProxy(Agri, [admin, treasury, feeBps], { initializer: 'initialize' });
  await instance.deployed();
  console.log('AgriEscrowUpgradeable proxy deployed at:', instance.address);
  console.log('Implementation address:', await upgrades.erc1967.getImplementationAddress(instance.address));
}

main().catch(e => { console.error(e); process.exit(1); });
