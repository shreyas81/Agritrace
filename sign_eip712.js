const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const [,, rpcUrl, privateKey, batchRef, pass, detailsCID] = process.argv;
  if (!rpcUrl) return console.log('Usage: node sign_eip712.js <rpcUrl> <privateKey> <batchRef> <pass> <detailsCID>');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  const domain = { name: 'AgriEscrow', version: '1', chainId: (await provider.getNetwork()).chainId, verifyingContract: '0x0000000000000000000000000000000000000000' };
  const types = { Verification: [ { name: 'batchId', type: 'bytes32' }, { name: 'pass', type: 'bool' }, { name: 'detailsCID', type: 'string' } ] };
  const batchId = ethers.id(batchRef);
  const value = { batchId: batchId, pass: pass === 'true', detailsCID: detailsCID };
  const signature = await wallet._signTypedData(domain, types, value);
  console.log('Signature:', signature);
}

main().catch(console.error);
