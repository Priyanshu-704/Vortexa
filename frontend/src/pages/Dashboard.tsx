import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { ReferralStats } from '../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const { balances, getHeaders, API_BASE } = useApp();
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

  const chartData = [
    { name: 'Day 1', balance: balances.totalEquity * 0.95 },
    { name: 'Day 2', balance: balances.totalEquity * 0.96 },
    { name: 'Day 3', balance: balances.totalEquity * 0.97 },
    { name: 'Day 4', balance: balances.totalEquity * 0.985 },
    { name: 'Day 5', balance: balances.totalEquity * 0.99 },
    { name: 'Day 6', balance: balances.totalEquity * 0.995 },
    { name: 'Day 7', balance: balances.totalEquity },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Available USDT Balance</p>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff' }}>
            {balances.balanceUSDT.toFixed(2)} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>USDT</span>
          </h2>
        </div>

        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Active Staked Funds</p>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {balances.stakedUSDT.toFixed(2)} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>USDT</span>
          </h2>
        </div>

        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Referral MLM Earnings</p>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-green)' }}>
            {referralStats.totalEarnedUSDT.toFixed(2)} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>USDT</span>
          </h2>
        </div>

        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Portfolio Equity</p>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff' }}>
            {balances.totalEquity.toFixed(2)} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>USDT</span>
          </h2>
        </div>
      </div>

      <div className="glass-panel" style={{ minHeight: '340px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Portfolio Growth Visualizer</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>7-day equity accrual history</p>
          </div>
        </div>
        <div style={{ width: '100%', height: '240px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#0d1426', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="balance" stroke="var(--accent-cyan)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
