import React from 'react';
import { useApp } from '../context/AppContext';
import { useAdmin } from '../context/AdminContext';

export default function AdminDashboard() {
  const { aiStatus } = useApp();
  const {
    adminStats,
    volatilityInput,
    setVolatilityInput,
    adminPinInput,
    setAdminPinInput,
    adminPendingWithdrawals,
    toggleAIEngine,
    adjustVolatility,
    approveWithdrawal,
    rejectWithdrawal
  } = useAdmin();

  const handleAdjustVolatility = () => {
    adjustVolatility(volatilityInput);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Registered Users</p>
          <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: '6px' }}>{adminStats.totalUsers}</h3>
        </div>
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Total Deposited</p>
          <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '6px' }}>{adminStats.totalDepositedUSDT.toFixed(2)} USDT</h3>
        </div>
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Total Approved Outflow</p>
          <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '6px' }}>{adminStats.totalWithdrawnUSDT.toFixed(2)} USDT</h3>
        </div>
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Total System Assets</p>
          <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: '6px' }}>{adminStats.systemBalances.totalEquity.toFixed(2)} USDT</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>AI Engine Configuration</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => toggleAIEngine('RUNNING')} disabled={aiStatus.status === 'RUNNING'}>Start Bot</button>
            <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', color: '#ff1744' }} onClick={() => toggleAIEngine('PAUSED')} disabled={aiStatus.status === 'PAUSED'}>Pause Bot</button>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Simulate Volatility Spill</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" step="0.01" className="form-control" placeholder="Enter Volatility" value={volatilityInput} onChange={(e) => setVolatilityInput(e.target.value)} />
              <button type="button" className="btn-secondary" onClick={handleAdjustVolatility}>Set</button>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Escrow Withdrawal Authorizations</h3>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Admin Security PIN</label>
            <input type="password" className="form-control" placeholder="Enter PIN (9999)" value={adminPinInput} onChange={(e) => setAdminPinInput(e.target.value)} />
          </div>

          {adminPendingWithdrawals.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No pending authorizations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
              {adminPendingWithdrawals.map((w) => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{w.username}</span>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Amount: {w.amount} USDT</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" className="btn-primary" style={{ padding: '4px 10px', fontSize: '11.5px', boxShadow: 'none' }} onClick={() => approveWithdrawal(w.id)}>Approve</button>
                    <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11.5px', color: '#ff1744' }} onClick={() => rejectWithdrawal(w.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
