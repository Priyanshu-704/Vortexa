import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, AlertTriangle, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken, setUser, setIsAuthenticated, fetchProfile, showNotificationAlert, API_BASE } = useApp();

  // Resolve mode from path
  const path = location.pathname;
  const authMode = path === '/register' ? 'register' :
                   path === '/verify' ? 'verify' :
                   path === '/forgot' ? 'forgot' :
                   path === '/reset' ? 'reset' : 'login';

  // Input states
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [refCodeInput, setRefCodeInput] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Status states
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Clear messages on path change
  useEffect(() => {
    setErrorMessage('');
    setSuccessMessage('');

    // Prepopulate state passed from previous route
    const state = location.state as any;
    if (state) {
      if (state.email) {
        if (authMode === 'verify') setVerificationEmail(state.email);
        if (authMode === 'reset') setResetEmailInput(state.email);
      }
      if (state.successMessage) setSuccessMessage(state.successMessage);
      if (state.errorMessage) setErrorMessage(state.errorMessage);
    }
  }, [authMode, location.state]);

  const handleBackToWebsite = () => navigate('/');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (authMode === 'login') {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.status === 'PENDING') {
            navigate('/verify', {
              state: {
                email: data.email,
                errorMessage: 'Your email is not verified yet. An OTP has been sent.'
              }
            });
          } else {
            setErrorMessage(data.error || 'Authentication failed');
          }
          return;
        }

        setToken(data.accessToken);
        setUser(data.user);
        localStorage.setItem('vortexa_token', data.accessToken);
        localStorage.setItem('vortexa_user', JSON.stringify(data.user));
        setIsAuthenticated(true);
        fetchProfile();

        if (data.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }

        setUsernameInput('');
        setPasswordInput('');
      } catch (err) {
        setErrorMessage('Could not connect to backend server');
      }
    } else if (authMode === 'register') {
      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, email: emailInput, password: passwordInput, referredBy: refCodeInput })
        });
        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || 'Registration failed');
          return;
        }

        navigate('/verify', {
          state: {
            email: emailInput,
            successMessage: 'Registration successful. Please enter the OTP sent to your email.'
          }
        });
      } catch (err) {
        setErrorMessage('Could not connect to backend server');
      }
    }
  };

  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail, code: otpCodeInput })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Email verification failed');
        return;
      }

      setToken(data.accessToken);
      setUser(data.user);
      localStorage.setItem('vortexa_token', data.accessToken);
      localStorage.setItem('vortexa_user', JSON.stringify(data.user));
      setIsAuthenticated(true);
      fetchProfile();

      setOtpCodeInput('');
      navigate(data.user.role === 'ADMIN' ? '/admin' : '/dashboard');
      showNotificationAlert('Account Activated!', 'Email verified successfully! Welcome to Vortexa.', 'success');
    } catch (err) {
      setErrorMessage('Verification failed: Server connection issue');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmailInput })
      });
      const data = await res.json();

      if (res.ok) {
        navigate('/reset', {
          state: {
            email: resetEmailInput,
            successMessage: data.message
          }
        });
      } else {
        setErrorMessage(data.error || 'Password reset request failed');
      }
    } catch (err) {
      setErrorMessage('Connection failed');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmailInput, code: otpCodeInput, newPassword: newPasswordInput })
      });
      const data = await res.json();

      if (res.ok) {
        showNotificationAlert('Password Reset!', data.message, 'success');
        setResetEmailInput('');
        setOtpCodeInput('');
        setNewPasswordInput('');
        navigate('/login');
      } else {
        setErrorMessage(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setErrorMessage('Connection failed');
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#030712', minHeight: '100vh', position: 'relative' }}>
      
      {/* Back to Website Button */}
      <button 
        type="button" 
        onClick={handleBackToWebsite}
        style={{ position: 'absolute', top: '30px', left: '30px', background: 'transparent', border: 'none', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
      >
        <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
        Back to Website
      </button>

      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
            <Shield size={32} color="#00e5ff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, letterSpacing: '1px' }}>VORTEXA</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>Enterprise AI-Powered DeFi & Arbitrage System</p>
        </div>

        {/* View selectors */}
        {(authMode === 'login' || authMode === 'register') && (
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '4px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ flex: 1, border: 'none', background: authMode === 'login' ? 'rgba(0, 229, 255, 0.15)' : 'transparent', color: authMode === 'login' ? '#00e5ff' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              style={{ flex: 1, border: 'none', background: authMode === 'register' ? 'rgba(0, 229, 255, 0.15)' : 'transparent', color: authMode === 'register' ? '#00e5ff' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}
            >
              Sign Up
            </button>
          </div>
        )}

        {successMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.2)', padding: '12px', borderRadius: '8px', color: 'var(--accent-green)', fontSize: '12.5px', marginBottom: '16px' }}>
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. Login & Registration Forms */}
        {(authMode === 'login' || authMode === 'register') && (
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Username / Email</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter username or email"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter verified email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Password</label>
                {authMode === 'login' && (
                  <button type="button" style={{ background: 'transparent', border: 'none', color: '#00e5ff', fontSize: '12px', cursor: 'pointer' }} onClick={() => navigate('/forgot')}>
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                className="form-control"
                placeholder="Enter password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Referral Code (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter referral code"
                  value={refCodeInput}
                  onChange={(e) => setRefCodeInput(e.target.value)}
                />
              </div>
            )}

            {errorMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#ff1744', fontSize: '12.5px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
              {authMode === 'login' ? 'Sign In to Portal' : 'Register New Account'}
              <ChevronRight size={18} />
            </button>
          </form>
        )}

        {/* 2. Verification Screen (OTP Code Input) */}
        {authMode === 'verify' && (
          <form onSubmit={handleOTPVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Verify Your Email</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
              Please confirm your email address and enter the 6-digit OTP code to activate your account.
            </p>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter email address"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Verification OTP Code</label>
              <input
                type="text"
                maxLength={6}
                className="form-control"
                placeholder="Enter 6-digit code"
                value={otpCodeInput}
                onChange={(e) => setOtpCodeInput(e.target.value)}
                required
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '20px', fontFamily: 'monospace' }}
              />
            </div>

            {errorMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#ff1744', fontSize: '12.5px' }}>
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/login')}>Back</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Confirm Verification</button>
            </div>
          </form>
        )}

        {/* 3. Forgot Password Screen */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Reset Password</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4 }}>
              Enter the email address associated with your Vortexa account. We will send a time-limited OTP code to securely reset your password.
            </p>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="Enter registered email"
                value={resetEmailInput}
                onChange={(e) => setResetEmailInput(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#ff1744', fontSize: '12.5px' }}>
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/login')}>Back</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Send OTP</button>
            </div>
          </form>
        )}

        {/* 4. Reset Password OTP Screen */}
        {authMode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Create New Password</h3>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Reset OTP Token</label>
              <input
                type="text"
                maxLength={6}
                className="form-control"
                placeholder="Enter 6-digit code"
                value={otpCodeInput}
                onChange={(e) => setOtpCodeInput(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>New Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 8 characters, numbers & letters"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                required
              />
            </div>

            {errorMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#ff1744', fontSize: '12.5px' }}>
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/login')}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Reset Password</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
