#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const [,, rpcUrl, privateKey, contractAddress, batchRef, farmer, tokenAddr, amount] = process.argv;
  if (!rpcUrl) return console.log('Usage: node createBatch.js <rpcUrl> <privateKey> <contractAddress> <batchRef> <farmer> <tokenAddr> <amount>');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = JSON.parse(fs.readFileSync('./AgriEscrowABI.json'));
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const batchId = ethers.id(batchRef);
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const tx = await contract.createBatch(batchId, farmer, tokenAddr, amount, 'ipfs://cid-cli', deadline, ethers.constants.HashZero);
  console.log('createBatch tx hash', tx.hash);
  const receipt = await tx.wait();
  console.log('Transaction mined in block', receipt.blockNumber);
}

main().catch(console.error);
