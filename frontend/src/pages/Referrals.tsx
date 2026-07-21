import React, { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ReferralStats } from '../types';

export default function Referrals() {
  const { user, getHeaders, API_BASE, showNotificationAlert } = useApp();
  const [referralStats, setReferralStats] = useState<ReferralStats>({ referredCount: 0, totalEarnedUSDT: 0 });

  const fetchReferralStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/referral/stats`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setReferralStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const copyToClipboard = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.refCode);
    showNotificationAlert('Copied!', 'Referral code copied to clipboard.', 'success');
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Referral Network</h3>
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Your Referral Code</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{user.refCode}</span>
            <button type="button" className="btn-secondary" style={{ padding: '6px' }} onClick={copyToClipboard}>
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Network Downline</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>REFERRED USERS</p>
            <h3 style={{ fontSize: '22px', fontWeight: 700 }}>{referralStats.referredCount}</h3>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>COMMISSIONS EARNED</p>
            <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent-green)' }}>{referralStats.totalEarnedUSDT.toFixed(2)} USDT</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
