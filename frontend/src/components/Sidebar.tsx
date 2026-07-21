import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Coins,
  Wallet,
  Users,
  Cpu,
  Bell,
  Sliders,
  LogOut,
  User as UserIcon,
  Key,
  Settings
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, logout } = useApp();

  const [showAccountPopover, setShowAccountPopover] = useState(false);

  const pathname = location.pathname;

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowAccountPopover(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <aside style={{ width: '260px', background: 'rgba(6, 9, 19, 0.8)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
          <Shield size={20} color="#00e5ff" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#fff' }}>VORTEXA</span>
      </div>

      <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {/* Standard investor navigation */}
        {user.role !== 'ADMIN' && (
          <>
            <button
              type="button"
              onClick={() => handleNavigate('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/dashboard' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: pathname === '/dashboard' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/staking')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/staking' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: pathname === '/staking' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
            >
              <Coins size={18} />
              Staking Pools
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/wallet')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/wallet' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: pathname === '/wallet' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
            >
              <Wallet size={18} />
              Wallet Integration
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/referrals')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/referrals' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: pathname === '/referrals' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
            >
              <Users size={18} />
              Referral & MLM
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/ai')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/ai' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: pathname === '/ai' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
            >
              <Cpu size={18} />
              AI Arbitrage Monitor
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/notifications')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/notifications' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: pathname === '/notifications' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
            >
              <Bell size={18} />
              Notification Center
            </button>
          </>
        )}

        {/* Administrator navigation */}
        {user.role === 'ADMIN' && (
          <>
            <button
              type="button"
              onClick={() => handleNavigate('/admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/admin' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: pathname === '/admin' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
            >
              <Sliders size={18} />
              Admin Panel
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/admin/users')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/admin/users' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: pathname === '/admin/users' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
            >
              <Users size={18} />
              Users Management
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/admin/logs')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/admin/logs' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: pathname === '/admin/logs' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
            >
              <Shield size={18} />
              Audit Security Logs
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('/notifications')}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: pathname === '/notifications' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: pathname === '/notifications' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
            >
              <Bell size={18} />
              Notification Center
            </button>
          </>
        )}
      </nav>

      <div style={{ padding: '20px 16px', borderTop: '1px solid var(--border-color)', position: 'relative' }}>
        {/* Account Popover */}
        {showAccountPopover && (
          <div style={{ position: 'absolute', bottom: '70px', left: '16px', right: '16px', background: '#0d1426', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px', zIndex: 100, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              onClick={() => handleNavigate('/profile')}
              style={{ background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', padding: '10px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px' }}
            >
              <UserIcon size={15} />
              View Profile
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('/update-password')}
              style={{ background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', padding: '10px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px' }}
            >
              <Key size={15} />
              Update Password
            </button>
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
            <button
              type="button"
              onClick={handleLogout}
              style={{ background: 'transparent', border: 'none', color: '#ff1744', textAlign: 'left', padding: '10px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px' }}
            >
              <LogOut size={15} />
              Log Out
            </button>
          </div>
        )}

        {/* Clickable Profile Card */}
        <div 
          onClick={() => setShowAccountPopover(!showAccountPopover)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', background: showAccountPopover ? 'rgba(255,255,255,0.03)' : 'transparent' }}
        >
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.displayName || user.username}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user.role === 'ADMIN' ? 'Administrator' : 'Verified Investor'}</p>
          </div>
          <Settings size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: '8px' }} />
        </div>
      </div>
    </aside>
  );
}
