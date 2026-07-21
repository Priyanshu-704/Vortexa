import React from 'react';
import { useAdmin } from '../context/AdminContext';

export default function AdminLogs() {
  const { adminAuditLogs } = useAdmin();

  return (
    <div className="glass-panel animate-fade-in">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Global Security Audits</h3>
      <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {adminAuditLogs.map((log) => (
          <div key={log.id} style={{ fontSize: '12px', padding: '10px 14px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>[{log.action}]</span>{' '}
              <span>{log.details}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{new Date(log.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
