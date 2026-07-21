import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useApp } from '../context/AppContext';
import type { Transaction } from '../types';

export default function Wallet() {
  const { balances, getHeaders, API_BASE, fetchBalance, fetchProfile, showNotificationAlert } = useApp();

  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);
  const [mockPrivateKey, setMockPrivateKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/wallet/transactions`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setTransactions(data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const connectWallet = async () => {
    setIsWalletConnecting(true);
    setErrorMessage('');
    try {
      let walletAddress = '';
      let signature = '';
      const message = `VORTEXA_AUTHENTICATION_SIGNATURE_VERIFY_${Date.now()}`;

      let connectedViaMetamask = false;
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          const signer = await provider.getSigner();
          walletAddress = accounts[0];
          signature = await signer.signMessage(message);
          connectedViaMetamask = true;
        } catch (metamaskErr) {
          console.warn("MetaMask connection failed, falling back to simulated mock wallet:", metamaskErr);
        }
      }

      if (!connectedViaMetamask) {
        let privateKey = mockPrivateKey;
        if (!privateKey) {
          const randomWallet = ethers.Wallet.createRandom();
          privateKey = randomWallet.privateKey;
          setMockPrivateKey(privateKey);
        }
        const simWallet = new ethers.Wallet(privateKey);
        walletAddress = simWallet.address;
        signature = await simWallet.signMessage(message);
      }

      const res = await fetch(`${API_BASE}/wallet/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ address: walletAddress, message, signature })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to connect wallet');
      } else {
        fetchBalance();
        fetchTransactions();
        fetchProfile();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signature request failed');
    } finally {
      setIsWalletConnecting(false);
    }
  };

  const handleDeposit = async () => {
    setErrorMessage('');
    const amt = parseFloat(depositAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid deposit amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Deposit failed');
      } else {
        setDepositAmountInput('');
        fetchBalance();
        fetchTransactions();
        showNotificationAlert('Deposit Confirmed!', `Deposit Successful! TX Hash: ${data.txHash}`, 'success');
      }
    } catch (err) {
      setErrorMessage('Server connection error during deposit');
    }
  };

  const handleWithdraw = async () => {
    setErrorMessage('');
    const amt = parseFloat(withdrawAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid withdrawal amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Withdrawal request failed');
      } else {
        setWithdrawAmountInput('');
        fetchBalance();
        fetchTransactions();
        showNotificationAlert('Withdrawal Submitted!', 'Withdrawal request submitted! Pending admin validation.', 'success');
      }
    } catch (err) {
      setErrorMessage('Server connection error during withdrawal');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Web3 Wallet Connection</h3>
        {balances.address ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Linked Wallet</p>
            <p style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', color: '#fff' }}>{balances.address}</p>
          </div>
        ) : (
          <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={connectWallet} disabled={isWalletConnecting}>
            {isWalletConnecting ? 'Verifying Signature...' : 'Link Web3 Wallet'}
          </button>
        )}
        {errorMessage && (
          <div style={{ color: '#ff1744', fontSize: '13.5px', marginTop: '4px' }}>
            {errorMessage}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Deposit & Withdraw</h3>
        {balances.address ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Deposit USDT</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" className="form-control" placeholder="Amount" value={depositAmountInput} onChange={(e) => setDepositAmountInput(e.target.value)} />
                <button type="button" className="btn-primary" onClick={handleDeposit}>Deposit</button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Withdraw USDT</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="number" className="form-control" placeholder="Amount" value={withdrawAmountInput} onChange={(e) => setWithdrawAmountInput(e.target.value)} />
                <button type="button" className="btn-primary" onClick={handleWithdraw}>Withdraw</button>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please connect a Web3 wallet first.</p>
        )}
      </div>

      {/* Transaction History Ledger */}
      <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Transaction Audit History</h3>
        {transactions.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No transactions recorded.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Tx Hash</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{tx.type}</td>
                    <td style={{ padding: '12px 8px' }}>{tx.amount.toFixed(2)} USDT</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-green' : tx.status === 'PENDING' ? 'badge-gold' : 'badge-red'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-8)}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
