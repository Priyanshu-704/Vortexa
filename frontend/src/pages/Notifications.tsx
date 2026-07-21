import React from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Notifications() {
  const { notifications, setNotifications } = useApp();

  return (
    <div className="animate-fade-in" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '10px', borderRadius: '50%' }}>
              <Bell size={24} color="#00e5ff" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Notification Center</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>Access your security updates, login alerts, and DeFi execution logs.</p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => setNotifications([])}
            style={{ padding: '8px 16px', fontSize: '12.5px', color: '#ff1744' }}
          >
            Clear All
          </button>
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Bell size={48} color="var(--text-muted)" style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>You are completely caught up!</p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Any new system logs or alerts will appear here in real-time.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((n) => (
              <div 
                key={n.id} 
                style={{ 
                  padding: '16px', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span 
                    className={`badge ${
                      n.type === 'SECURITY' ? 'badge-red' : 
                      n.type === 'WALLET' ? 'badge-cyan' : 
                      'badge-gold'
                    }`}
                  >
                    {n.type}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p style={{ color: '#fff', fontSize: '13.5px', lineHeight: 1.4, marginTop: '4px' }}>
                  {n.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
