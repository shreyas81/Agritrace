const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('AgriEscrowUpgradeable', function () {
  let owner, farmer, buyer, verifier, arbitrator;
  let Token, token, Agri, escrow;

  beforeEach(async function () {
    [owner, farmer, buyer, verifier, arbitrator] = await ethers.getSigners();
    Token = await ethers.getContractFactory('ERC20Test');
    token = await Token.deploy('TestUSD', 'TUSD', 18);
    await token.deployed();

    Agri = await ethers.getContractFactory('AgriEscrowUpgradeable');
    escrow = await upgrades.deployProxy(Agri, [owner.address, owner.address, 100], { initializer: 'initialize' });
    await escrow.deployed();

    await escrow.grantVerifier(verifier.address);
    await escrow.grantArbitrator(arbitrator.address);

    // mint tokens for buyer
    await token.mint(buyer.address, ethers.utils.parseUnits('1000', 18));
  });

  it('full flow: create -> fund -> verify (direct) -> paid', async function () {
    const batchId = ethers.utils.id('batch-1');
    const amount = ethers.utils.parseUnits('100', 18);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    await escrow.connect(buyer).createBatch(batchId, farmer.address, token.address, amount, 'ipfs://cid1', deadline, ethers.constants.HashZero);
    await token.connect(buyer).approve(escrow.address, amount);
    await escrow.connect(buyer).fundEscrow(batchId);
    await escrow.connect(verifier).submitVerification(batchId, true, 'ipfs://verify1', '0x');

    const b = await escrow.getBatch(batchId);
    expect(b.status).to.equal(4); // PAID
  });

  it('EIP-712 signature based verification', async function () {
    const batchId = ethers.utils.id('batch-2');
    const amount = ethers.utils.parseUnits('50', 18);
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    await escrow.connect(buyer).createBatch(batchId, farmer.address, token.address, amount, 'ipfs://cid2', deadline, ethers.constants.HashZero);
    await token.connect(buyer).approve(escrow.address, amount);
    await escrow.connect(buyer).fundEscrow(batchId);

    // Build EIP-712 typed data
    const domain = { name: 'AgriEscrow', version: '1', chainId: (await ethers.provider.getNetwork()).chainId, verifyingContract: escrow.address };
    const types = { Verification: [ { name: 'batchId', type: 'bytes32' }, { name: 'pass', type: 'bool' }, { name: 'detailsCID', type: 'string' } ] };
    const value = { batchId: batchId, pass: true, detailsCID: 'ipfs://verify2' };
    const signature = await verifier._signTypedData(domain, types, value);

    // Any account can submit the signed verification
    await escrow.connect(buyer).submitVerification(batchId, true, 'ipfs://verify2', signature);

    const b = await escrow.getBatch(batchId);
    expect(b.status).to.equal(4);
  });

  it('refund if deadline passes', async function () {
    const batchId = ethers.utils.id('batch-3');
    const amount = ethers.utils.parseUnits('10', 18);
    const deadline = Math.floor(Date.now() / 1000) + 1; // very short

    await escrow.connect(buyer).createBatch(batchId, farmer.address, token.address, amount, 'ipfs://cid3', deadline, ethers.constants.HashZero);
    await token.connect(buyer).approve(escrow.address, amount);
    await escrow.connect(buyer).fundEscrow(batchId);

    // fast-forward time
    await ethers.provider.send('evm_increaseTime', [3600]);
    await ethers.provider.send('evm_mine');

    await escrow.connect(buyer).refund(batchId);
    const b = await escrow.getBatch(batchId);
    expect(b.status).to.equal(5); // REFUNDED
  });
});
