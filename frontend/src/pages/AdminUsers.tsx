import React from 'react';
import { useAdmin } from '../context/AdminContext';

export default function AdminUsers() {
  const { adminUsersList } = useAdmin();

  return (
    <div className="glass-panel animate-fade-in">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>System Users Directory</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Username</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Role</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Referral Code</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>USDT Balance</th>
            </tr>
          </thead>
          <tbody>
            {adminUsersList.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: '10px 8px' }}><span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : 'badge-cyan'}`}>{u.role}</span></td>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{u.refCode}</td>
                <td style={{ padding: '10px 8px' }}>{u.balanceUSDT.toFixed(2)} USDT</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
