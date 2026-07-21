import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ArrowRight,
  TrendingUp,
  Activity,
  Coins,
  Cpu,
  Users
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const handleLaunchApp = () => navigate('/login');
  const handleConnectPortal = () => navigate('/register');

  return (
    <div className="animate-fade-in" style={{ background: '#030712', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <header style={{ height: '80px', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(3, 7, 18, 0.7)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <Shield size={22} color="#00e5ff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, letterSpacing: '1px' }}>VORTEXA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>TVL: <strong style={{ color: '#00e5ff' }}>$25.4M USDT</strong></span>
          <button type="button" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '30px' }} onClick={handleLaunchApp}>
            Launch App
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 80px', textAlign: 'center', background: 'radial-gradient(circle at center, rgba(0,229,255,0.06) 0%, transparent 60%)' }}>
        <div className="badge badge-cyan" style={{ marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1.5px', padding: '6px 16px' }}>
          Next-Gen DeFi Staking & Arbitrage
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: 900, lineHeight: 1.1, maxWidth: '800px', letterSpacing: '-1px', marginBottom: '20px' }}>
          Autonomous Yield Optimization Swarms
        </h1>
        <p style={{ fontSize: '17px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.6, marginBottom: '32px' }}>
          Maximize returns using neural-validated cross-DEX spreads and institutional-grade staking rules, guarded by the AI Volatility Umbrella.
        </p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button type="button" className="btn-primary" style={{ padding: '12px 30px', fontSize: '15px' }} onClick={handleConnectPortal}>
            Connect Portal
          </button>
          <button type="button" className="btn-secondary" style={{ padding: '12px 30px', fontSize: '15px' }} onClick={handleLaunchApp}>
            Sign In
          </button>
        </div>
      </section>

      {/* Analytics Summary */}
      <section style={{ padding: '0 40px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <TrendingUp size={24} color="#00e5ff" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '28px', fontWeight: 800 }}>$25,480,912</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Total Value Locked (USDT)</p>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <Activity size={24} color="var(--accent-green)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '28px', fontWeight: 800 }}>54,082</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>AI Arbitrage Trades Executed</p>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center' }}>
            <Coins size={24} color="#ffd700" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '28px', fontWeight: 800 }}>Up To 24%</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Compound Staking APY Tiers</p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section style={{ background: '#090d1a', padding: '80px 40px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800 }}>Platform Structural Foundations</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>Verified blockchain allocations backed by dynamic security guardrails</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
            <div className="glass-panel">
              <Cpu size={24} color="#00e5ff" style={{ marginBottom: '16px' }} />
              <h4 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>AI Price Sweeps</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Automatically captures minor price differences across multiple decentralized exchanges continuously.</p>
            </div>
            <div className="glass-panel">
              <Shield size={24} color="#ff1744" style={{ marginBottom: '16px' }} />
              <h4 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>Umbrella Protective Shield</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Instantly halts trading scans and swaps exposed capital back to stable USDT if volatility breaches safety limits.</p>
            </div>
            <div className="glass-panel">
              <Users size={24} color="var(--accent-green)" style={{ marginBottom: '16px' }} />
              <h4 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>3-Tier Compensation Tree</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Multi-level passive earnings and direct deposit commissions (5%/3%/1%) routed directly through referral branches.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '30px 40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '12px', color: 'var(--text-muted)' }}>
        &copy; 2026 Vortexa Web3 Protocol. Audited & Secure.
      </footer>
    </div>
  );
}
