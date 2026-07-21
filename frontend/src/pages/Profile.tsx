import React, { useState, useEffect } from 'react';
import { User as UserIcon, Sliders, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Profile() {
  const { user, profile, setProfile, getHeaders, API_BASE, showNotificationAlert } = useApp();

  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editTimezone, setEditTimezone] = useState('UTC');
  const [editNotificationPrefs, setEditNotificationPrefs] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setEditDisplayName(profile.displayName || '');
      setEditAvatar(profile.avatar || '');
      setEditTimezone(profile.timezone || 'UTC');
      setEditNotificationPrefs(profile.notificationPrefs || 'ALL');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/profile/update`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          displayName: editDisplayName,
          avatar: editAvatar,
          timezone: editTimezone,
          notificationPrefs: editNotificationPrefs
        })
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((prev: any) => ({ ...prev, ...data.profile }));
        showNotificationAlert('Profile Updated!', data.message, 'success');
      } else {
        setErrorMessage(data.error || 'Update failed');
      }
    } catch (err) {
      setErrorMessage('Server connection error during update');
    }
  };

  if (!profile || !user) {
    return (
      <div className="glass-panel animate-fade-in" style={{ width: '100%', textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading profile parameters...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', width: '100%' }}>
      {/* Left Column: Summary Info */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px', textAlign: 'center' }}>
        <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '24px', borderRadius: '50%', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
          <UserIcon size={64} color="#00e5ff" />
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            {profile.displayName || user.username}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'monospace' }}>
            ID: {user.id.slice(0, 8)}...
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Role:</span>
            <span className="badge badge-cyan">{profile.role}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
            <span className="badge badge-green">{profile.status}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ref Code:</span>
            <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{user.refCode}</span>
          </div>
        </div>
      </div>

      {/* Right Column: Editable Options Form */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
          <Sliders size={20} color="#00e5ff" />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Profile Parameters</h3>
        </div>

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <Mail size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '14.5px', color: 'var(--text-secondary)' }}>{profile.email}</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Display Name</label>
            <input type="text" className="form-control" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} required />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Timezone</label>
            <select className="form-control" value={editTimezone} onChange={(e) => setEditTimezone(e.target.value)}>
              <option value="UTC">UTC (Greenwich Mean Time)</option>
              <option value="GMT+1">GMT+1 (Central European Time)</option>
              <option value="GMT+2">GMT+2 (Eastern European Time)</option>
              <option value="GMT-5">GMT-5 (Eastern Standard Time)</option>
              <option value="GMT-8">GMT-8 (Pacific Standard Time)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Notification Preferences</label>
            <select className="form-control" value={editNotificationPrefs} onChange={(e) => setEditNotificationPrefs(e.target.value)}>
              <option value="ALL">All Alerts (Email & App)</option>
              <option value="EMAIL_ONLY">Email Notifications Only</option>
              <option value="NONE">Disable Alerts</option>
            </select>
          </div>

          {errorMessage && (
            <div style={{ color: '#ff1744', fontSize: '13.5px', marginTop: '4px' }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>Save Profile Changes</button>
        </form>
      </div>
    </div>
  );
}
