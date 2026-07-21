import React, { useState } from 'react';
import { Key, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function UpdatePassword() {
  const { getHeaders, API_BASE, showNotificationAlert } = useApp();

  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/profile/update-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ oldPassword: oldPasswordInput, newPassword: newPasswordInput })
      });
      const data = await res.json();
      if (res.ok) {
        setOldPasswordInput('');
        setNewPasswordInput('');
        setSuccessMessage(data.message);
        showNotificationAlert('Credentials Updated!', data.message, 'success');
      } else {
        setErrorMessage(data.error || 'Password update failed');
      }
    } catch (err) {
      setErrorMessage('Server connection error');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', width: '100%' }}>
      {/* Left Column: Instructions and Status */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '32px' }}>
        <div style={{ background: 'rgba(213, 0, 249, 0.1)', padding: '20px', borderRadius: '50%', border: '1px solid rgba(213, 0, 249, 0.2)', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Key size={32} color="#d500f9" />
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Security Guidelines</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
            To secure your digital assets, ensure your new password matches the following policy constraints:
          </p>
        </div>
        <ul style={{ color: 'var(--text-secondary)', fontSize: '12.5px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', lineHeight: 1.4 }}>
          <li>Minimum length of 8 characters.</li>
          <li>Incorporate at least one capital letter.</li>
          <li>Use a combination of letters, numbers, and special symbols.</li>
          <li>Never reuse passwords from other financial services.</li>
        </ul>
      </div>

      {/* Right Column: Update Credentials Form */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
          <Shield size={20} color="#d500f9" />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Update Security Credentials</h3>
        </div>

        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Current Password</label>
            <input type="password" className="form-control" placeholder="Verify old password" value={oldPasswordInput} onChange={(e) => setOldPasswordInput(e.target.value)} required />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>New Password</label>
            <input type="password" className="form-control" placeholder="Enter new password (min 8 characters)" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} required />
          </div>

          {errorMessage && (
            <div style={{ color: '#ff1744', fontSize: '13.5px', marginTop: '4px' }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div style={{ color: 'var(--accent-green)', fontSize: '13.5px', marginTop: '4px' }}>
              {successMessage}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-purple) 0%, #aa00ff 100%)', boxShadow: '0 4px 14px 0 rgba(213, 0, 249, 0.25)', marginTop: '8px' }}>
            Confirm Password Change
          </button>
        </form>
      </div>
    </div>
  );
}
