import React, { useState } from 'react';
import { CONTRACT_ADDRESS, ABI } from './config';
import { ethers } from 'ethers';

function App(){
  const [status, setStatus] = useState('Not connected');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [batchRef, setBatchRef] = useState('batch-frontend-1');
  const [farmer, setFarmer] = useState('');
  const [amount, setAmount] = useState('');

  async function connect(){
    if (!window.ethereum) return alert('Install MetaMask');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const p = new ethers.BrowserProvider(window.ethereum);
    const s = await p.getSigner();
    setProvider(p);
    setSigner(s);
    setStatus('Connected: ' + await s.getAddress());
    if (CONTRACT_ADDRESS !== 'REPLACE_CONTRACT_ADDRESS' && ABI.length > 0) {
      const c = new ethers.Contract(CONTRACT_ADDRESS, ABI, s);
      setContract(c);
    }
  }

  async function createBatch(){
    if (!contract) return alert('Set contract address & ABI in src/config.js');
    const batchId = ethers.id(batchRef);
    const deadline = Math.floor(Date.now()/1000) + 3600;
    const tx = await contract.createBatch(batchId, farmer, '0x0000000000000000000000000000000000000000', ethers.parseUnits(amount || '1', 18), 'ipfs://frontend', deadline, ethers.constants.HashZero);
    setStatus('createBatch tx sent: ' + tx.hash);
    await tx.wait();
    setStatus('Batch created');
  }

  return (
    <div style={{padding:20,fontFamily:'Arial'}}>
      <h1>AgriTrace Frontend</h1>
      <p>{status}</p>
      <button onClick={connect}>Connect Wallet</button>
      <hr />
      <h3>Create Batch</h3>
      <input value={batchRef} onChange={e=>setBatchRef(e.target.value)} /> <br />
      <input placeholder='Farmer address' value={farmer} onChange={e=>setFarmer(e.target.value)} /> <br />
      <input placeholder='Amount (tokens)' value={amount} onChange={e=>setAmount(e.target.value)} /> <br />
      <button onClick={createBatch}>Create Batch</button>
      <p>Note: This demo requires you to set CONTRACT_ADDRESS and ABI in src/config.js</p>
    </div>
  )
}

export default App;
