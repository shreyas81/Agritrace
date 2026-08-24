#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const [,, rpcUrl, privateKey, contractAddress, batchRef] = process.argv;
  if (!rpcUrl) return console.log('Usage: node fundEscrow.js <rpcUrl> <privateKey> <contractAddress> <batchRef>');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = JSON.parse(fs.readFileSync('./AgriEscrowABI.json'));
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const batchId = ethers.id(batchRef);
  const tx = await contract.fundEscrow(batchId);
  console.log('fundEscrow tx hash', tx.hash);
  const receipt = await tx.wait();
  console.log('Mined in block', receipt.blockNumber);
}

main().catch(console.error);
