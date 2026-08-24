#!/usr/bin/env node
const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const [,, rpcUrl, privateKey, contractAddress, batchRef, pass, detailsCID] = process.argv;
  if (!rpcUrl) return console.log('Usage: node submitVerification.js <rpcUrl> <privateKey> <contractAddress> <batchRef> <pass> <detailsCID>');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const abi = JSON.parse(fs.readFileSync('./AgriEscrowABI.json'));
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const batchId = ethers.id(batchRef);
  const tx = await contract.submitVerification(batchId, pass === 'true', detailsCID, '0x');
  console.log('submitVerification tx hash', tx.hash);
  const receipt = await tx.wait();
  console.log('Mined in block', receipt.blockNumber);
}

main().catch(console.error);
