import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { aiStatus, balances, notifications } = useApp();

  const pathname = location.pathname;

  return (
    <header style={{ height: '70px', padding: '0 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6, 9, 19, 0.3)', backdropFilter: 'blur(10px)' }}>
      <div>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>Global Volatility:</span>{' '}
        <span className={`badge ${aiStatus.currentVolatility > 0.08 ? 'badge-red' : 'badge-green'}`} style={{ marginLeft: '6px' }}>
          {(aiStatus.currentVolatility * 100).toFixed(2)}% {aiStatus.currentVolatility > 0.08 ? '(CRITICAL)' : '(STABLE)'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Notifications Bell Redirect */}
        <button 
          type="button" 
          onClick={() => navigate('/notifications')}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: pathname === '/notifications' ? '#00e5ff' : 'var(--text-secondary)', position: 'relative', transition: 'all 0.2s' }}
        >
          <Bell size={18} />
          {notifications.length > 0 && (
            <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', background: '#00e5ff', borderRadius: '50%', border: '2px solid #060913' }} />
          )}
        </button>

        {balances.address ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.15)', padding: '6px 12px', borderRadius: '30px' }}>
            <div style={{ width: '8px', height: '8px', background: '#00e5ff', borderRadius: '50%', boxShadow: '0 0 8px #00e5ff' }} />
            <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#00e5ff' }}>
              {balances.address.slice(0, 6)}...{balances.address.slice(-4)}
            </span>
          </div>
        ) : (
          <button type="button" className="btn-secondary" style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '30px' }} onClick={() => navigate('/wallet')}>
            <Wallet size={14} />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
