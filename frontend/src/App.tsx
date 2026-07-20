import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  Shield,
  Wallet,
  Coins,
  Users,
  Cpu,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  AlertTriangle,
  Copy,
  Sliders,
  Settings,
  Mail,
  User,
  Key,
  ArrowRight,
  TrendingUp,
  Activity,
  Bell
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ethers } from 'ethers';

// Base URLs
const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const showNotificationAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    Swal.fire({
      title,
      text,
      icon,
      background: '#0d1426',
      color: '#fff',
      confirmButtonColor: '#00e5ff',
    });
  };

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string; role: 'USER' | 'ADMIN'; refCode: string } | null>(null);

  // Portal vs Landing State
  const [showPortal, setShowPortal] = useState(false);

  // Forms inputs
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [refCodeInput, setRefCodeInput] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [resetEmailInput, setResetEmailInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'staking' | 'wallet' | 'referrals' | 'ai' | 'admin' | 'admin_users' | 'admin_logs' | 'profile' | 'update_password' | 'notifications'>('dashboard');

  // Popover & Notifications state
  const [showAccountPopover, setShowAccountPopover] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: '1', type: 'INFO', message: 'Welcome to Vortexa DeFi & AI Portal!', created_at: new Date().toISOString() },
    { id: '2', type: 'SECURITY', message: 'Logged in successfully from IP 127.0.0.1', created_at: new Date().toISOString() }
  ]);

  // Backend data
  const [balances, setBalances] = useState({ address: '', balanceUSDT: 0, stakedUSDT: 0, walletUSDTBalance: 0, totalEquity: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stakingPools, setStakingPools] = useState<any[]>([]);
  const [userPositions, setUserPositions] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>({ referredCount: 0, directReferrals: [], totalEarnedUSDT: 0 });
  const [aiStatus, setAiStatus] = useState<any>({ status: 'PAUSED', umbrellaRuleActive: false, currentVolatility: 0.02, totalExecutedTrades: 0, totalProfitUSDT: 0, recentTrades: [] });
  const [dexPrices, setDexPrices] = useState<any>({ prices: { uniswap: 3400, sushiswap: 3405, curve: 3398 } });

  // Profile data & Editing state
  const [profile, setProfile] = useState<any>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editTimezone, setEditTimezone] = useState('UTC');
  const [editNotificationPrefs, setEditNotificationPrefs] = useState('ALL');
  const [oldPasswordInput, setOldPasswordInput] = useState('');

  // Admin stats
  const [adminStats, setAdminStats] = useState<any>({ totalUsers: 0, totalDepositedUSDT: 0, totalWithdrawnUSDT: 0, systemBalances: { totalUSDT: 0, totalStakedUSDT: 0, totalEquity: 0 } });
  const [adminUsersList, setAdminUsersList] = useState<any[]>([]);
  const [adminPendingWithdrawals, setAdminPendingWithdrawals] = useState<any[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<any[]>([]);

  // Modals / Input states
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [volatilityInput, setVolatilityInput] = useState('0.02');

  // Simulated browser wallet (in case user has no metamask)
  const [mockPrivateKey, setMockPrivateKey] = useState<string | null>(null);
  const [isWalletConnecting, setIsWalletConnecting] = useState(false);

  // Background loops
  const scanInterval = useRef<NodeJS.Timeout | null>(null);

  // 1. Check local session storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('vortexa_token');
    const savedUser = localStorage.getItem('vortexa_user');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      setIsAuthenticated(true);
      if (parsedUser.role === 'ADMIN') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, []);

  // 2. Fetch data updates when token changes
  useEffect(() => {
    if (token) {
      fetchBalance();
      fetchTransactions();
      fetchStakingPools();
      fetchUserPositions();
      fetchReferralStats();
      fetchAIStatus();
      fetchProfile();
      if (user?.role === 'ADMIN') {
        fetchAdminData();
      }

      // Start fetching updates every 5 seconds
      scanInterval.current = setInterval(() => {
        fetchBalance();
        fetchAIStatus();
        fetchUserPositions();
        if (user?.role === 'ADMIN') {
          fetchAdminData();
        }
      }, 5000);
    } else {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
        scanInterval.current = null;
      }
    }

    return () => {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
    };
  }, [token]);

  // Request headers helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${API_BASE}/wallet/balance`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setBalances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_BASE}/wallet/transactions`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setTransactions(data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStakingPools = async () => {
    try {
      const res = await fetch(`${API_BASE}/staking/pools`);
      const data = await res.json();
      if (res.ok) setStakingPools(data.pools);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserPositions = async () => {
    try {
      const res = await fetch(`${API_BASE}/staking/positions`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setUserPositions(data.positions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReferralStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/referral/stats`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setReferralStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAIStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/status`);
      const data = await res.json();
      if (res.ok) setAiStatus(data);

      const resPrices = await fetch(`${API_BASE}/ai/prices`);
      const dataPrices = await resPrices.json();
      if (resPrices.ok) setDexPrices(dataPrices);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setEditDisplayName(data.profile.displayName);
        setEditAvatar(data.profile.avatar || '');
        setEditTimezone(data.profile.timezone);
        setEditNotificationPrefs(data.profile.notificationPrefs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const resStats = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
      const dataStats = await resStats.json();
      if (resStats.ok) setAdminStats(dataStats);

      const resUsers = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
      const dataUsers = await resUsers.json();
      if (resUsers.ok) setAdminUsersList(dataUsers.users);

      const resWiths = await fetch(`${API_BASE}/admin/withdrawals/pending`, { headers: getHeaders() });
      const dataWiths = await resWiths.json();
      if (resWiths.ok) setAdminPendingWithdrawals(dataWiths.withdrawals);

      const resLogs = await fetch(`${API_BASE}/admin/audit-logs`, { headers: getHeaders() });
      const dataLogs = await resLogs.json();
      if (resLogs.ok) setAdminAuditLogs(dataLogs.logs);
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Operations
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
            setVerificationEmail(data.email);
            setAuthMode('verify');
            setErrorMessage('Your email is not verified yet. An OTP has been sent.');
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
        
        // REDIRECT LOGIC
        if (data.user.role === 'ADMIN') {
          setActiveTab('admin');
        } else {
          setActiveTab('dashboard');
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

        setVerificationEmail(emailInput);
        setAuthMode('verify');
        setSuccessMessage('Registration successful. Please enter the OTP sent to your email.');
      } catch (err) {
        setErrorMessage('Could not connect to backend server');
      }
    }
  };

  // OTP Verification
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
      
      // REDIRECT LOGIC
      if (data.user.role === 'ADMIN') {
        setActiveTab('admin');
      } else {
        setActiveTab('dashboard');
      }

      setOtpCodeInput('');
      setAuthMode('login');
      showNotificationAlert('Account Activated!', 'Email verified successfully! Welcome to Vortexa.', 'success');
    } catch (err) {
      setErrorMessage('Verification failed: Server connection issue');
    }
  };

  // Forgot Password Request
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
        setSuccessMessage(data.message);
        setAuthMode('reset');
      } else {
        setErrorMessage(data.error || 'Password reset request failed');
      }
    } catch (err) {
      setErrorMessage('Connection failed');
    }
  };

  // Reset Password Execution
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
        setAuthMode('login');
      } else {
        setErrorMessage(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setErrorMessage('Connection failed');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: getHeaders() });
    } catch (err) {}
    localStorage.removeItem('vortexa_token');
    localStorage.removeItem('vortexa_user');
    setToken(null);
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setShowPortal(false);
    setActiveTab('dashboard');
  };

  // Wallet Connect
  const connectWallet = async () => {
    setIsWalletConnecting(true);
    setErrorMessage('');
    try {
      let walletAddress = '';
      let signature = '';
      const message = `VORTEXA_AUTHENTICATION_SIGNATURE_VERIFY_${Date.now()}`;

      let connectedViaMetamask = false;
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          const signer = await provider.getSigner();
          walletAddress = accounts[0];
          signature = await signer.signMessage(message);
          connectedViaMetamask = true;
        } catch (metamaskErr) {
          console.warn("MetaMask connection failed, falling back to simulated mock wallet:", metamaskErr);
        }
      }

      if (!connectedViaMetamask) {
        let privateKey = mockPrivateKey;
        if (!privateKey) {
          const randomWallet = ethers.Wallet.createRandom();
          privateKey = randomWallet.privateKey;
          setMockPrivateKey(privateKey);
        }
        const simWallet = new ethers.Wallet(privateKey);
        walletAddress = simWallet.address;
        signature = await simWallet.signMessage(message);
      }

      const res = await fetch(`${API_BASE}/wallet/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ address: walletAddress, message, signature })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to connect wallet');
      } else {
        fetchBalance();
        fetchTransactions();
        fetchProfile();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Signature request failed');
    } finally {
      setIsWalletConnecting(false);
    }
  };

  // Deposit Action
  const handleDeposit = async () => {
    setErrorMessage('');
    const amt = parseFloat(depositAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid deposit amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Deposit failed');
      } else {
        setDepositAmountInput('');
        fetchBalance();
        fetchTransactions();
        showNotificationAlert('Deposit Confirmed!', `Deposit Successful! TX Hash: ${data.txHash}`, 'success');
      }
    } catch (err) {
      setErrorMessage('Server connection error during deposit');
    }
  };

  // Withdrawal Action
  const handleWithdraw = async () => {
    setErrorMessage('');
    const amt = parseFloat(withdrawAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid withdrawal amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount: amt })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Withdrawal request failed');
      } else {
        setWithdrawAmountInput('');
        fetchBalance();
        fetchTransactions();
        showNotificationAlert('Withdrawal Submitted!', 'Withdrawal request submitted! Pending admin validation.', 'success');
      }
    } catch (err) {
      setErrorMessage('Server connection error during withdrawal');
    }
  };

  // Staking Operations
  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const amt = parseFloat(stakeAmount);
    if (!selectedPoolId || isNaN(amt) || amt <= 0) {
      setErrorMessage('Select a pool and enter a positive USDT amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/staking/stake`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ poolId: selectedPoolId, amount: amt })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to stake');
      } else {
        setStakeAmount('');
        fetchBalance();
        fetchUserPositions();
        fetchTransactions();
        showNotificationAlert('Allocated Staking!', 'Successfully allocated funds to staking pool!', 'success');
      }
    } catch (err) {
      setErrorMessage('Server error during staking');
    }
  };

  const handleClaimRewards = async (posId: string) => {
    try {
      const res = await fetch(`${API_BASE}/staking/claim`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ positionId: posId })
      });
      const data = await res.json();
      if (!res.ok) {
        showNotificationAlert('Error', data.error || 'Claim failed', 'error');
      } else {
        fetchBalance();
        fetchUserPositions();
        fetchTransactions();
        showNotificationAlert('Claim Success!', `Claimed ${data.claimedRewards} USDT successfully!`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnstake = async (posId: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will claim all rewards and release your principal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, unstake!',
      cancelButtonText: 'Cancel',
      background: '#0d1426',
      color: '#fff',
      confirmButtonColor: '#ff1744',
      cancelButtonColor: '#3085d6'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${API_BASE}/staking/unstake`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ positionId: posId })
          });
          const data = await res.json();
          if (!res.ok) {
            showNotificationAlert('Error', data.error || 'Unstake failed', 'error');
          } else {
            fetchBalance();
            fetchUserPositions();
            fetchTransactions();
            showNotificationAlert('Unstaked Successfully!', `Returned principal: ${data.principal} USDT and earnings: ${data.rewards} USDT.`, 'success');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Profile Update Actions
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

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
        showNotificationAlert('Credentials Updated!', data.message, 'success');
      } else {
        setErrorMessage(data.error || 'Password update failed');
      }
    } catch (err) {
      setErrorMessage('Server connection error');
    }
  };

  // Admin Controls
  const toggleAIEngine = async (newStatus: 'RUNNING' | 'PAUSED') => {
    try {
      const res = await fetch(`${API_BASE}/ai/toggle`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        fetchAIStatus();
        showNotificationAlert('AI Engine Update', data.message, 'success');
      } else {
        showNotificationAlert('Error', data.error, 'error');
      }
    } catch (err) {}
  };

  const handleAdjustVolatility = async () => {
    const vol = parseFloat(volatilityInput);
    if (isNaN(vol) || vol < 0) {
      showNotificationAlert('Invalid Volatility', 'Enter a valid volatility value', 'warning');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/ai/volatility`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ volatility: vol })
      });
      const data = await res.json();
      if (res.ok) {
        fetchAIStatus();
        showNotificationAlert('Volatility Updated!', data.message, 'success');
      } else {
        showNotificationAlert('Error', data.error, 'error');
      }
    } catch (err) {}
  };

  const approveWithdrawal = async (txId: string) => {
    if (!adminPinInput) {
      showNotificationAlert('MFA Verification Required', 'Enter Admin Multi-Factor PIN to authorize withdrawals', 'warning');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/approve`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'x-admin-pin': adminPinInput
        },
        body: JSON.stringify({ transactionId: txId })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminPinInput('');
        fetchAdminData();
        fetchBalance();
        showNotificationAlert('Withdrawal Approved', data.message, 'success');
      } else {
        showNotificationAlert('Error', data.error, 'error');
      }
    } catch (err) {}
  };

  const rejectWithdrawal = async (txId: string) => {
    if (!adminPinInput) {
      showNotificationAlert('MFA Verification Required', 'Enter Admin Multi-Factor PIN to reject withdrawals', 'warning');
      return;
    }
    Swal.fire({
      title: 'Reject Withdrawal',
      text: 'Enter reason for rejection:',
      input: 'text',
      inputPlaceholder: 'Reason for rejection...',
      showCancelButton: true,
      background: '#0d1426',
      color: '#fff',
      confirmButtonColor: '#ff1744',
      cancelButtonColor: '#3085d6',
      inputValidator: (value) => {
        if (!value) {
          return 'You must specify a reason for rejection!';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          const res = await fetch(`${API_BASE}/admin/withdrawals/reject`, {
            method: 'POST',
            headers: {
              ...getHeaders(),
              'x-admin-pin': adminPinInput
            },
            body: JSON.stringify({ transactionId: txId, reason: result.value })
          });
          const data = await res.json();
          if (res.ok) {
            setAdminPinInput('');
            fetchAdminData();
            showNotificationAlert('Withdrawal Rejected', data.message, 'success');
          } else {
            showNotificationAlert('Error', data.error, 'error');
          }
        } catch (err) {}
      }
    });
  };

  // Mock charts
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
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
      {/* -------------------- UNAUTHENTICATED: LANDING OR PORTAL -------------------- */}
      {!isAuthenticated && (
        <>
          {/* LANDING WEBSITE VIEW */}
          {!showPortal ? (
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
                  <button type="button" className="btn-primary" style={{ padding: '8px 20px', borderRadius: '30px' }} onClick={() => { setShowPortal(true); setAuthMode('login'); }}>
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
                  <button type="button" className="btn-primary" style={{ padding: '12px 30px', fontSize: '15px' }} onClick={() => { setShowPortal(true); setAuthMode('register'); }}>
                    Connect Portal
                  </button>
                  <button type="button" className="btn-secondary" style={{ padding: '12px 30px', fontSize: '15px' }} onClick={() => { setShowPortal(true); setAuthMode('login'); }}>
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
          ) : (
            /* PORTAL LOGIN/REGISTRATION FORM OVERLAY */
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#030712', minHeight: '100vh', position: 'relative' }}>
              
              {/* Back to Website Button */}
              <button 
                type="button" 
                onClick={() => { setShowPortal(false); setErrorMessage(''); setSuccessMessage(''); }}
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
                      onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                      style={{ flex: 1, border: 'none', background: authMode === 'login' ? 'rgba(0, 229, 255, 0.15)' : 'transparent', color: authMode === 'login' ? '#00e5ff' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setErrorMessage(''); setSuccessMessage(''); }}
                      style={{ flex: 1, border: 'none', background: authMode === 'register' ? 'rgba(0, 229, 255, 0.15)' : 'transparent', color: authMode === 'register' ? '#00e5ff' : 'var(--text-secondary)', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}
                    >
                      Sign Up
                    </button>
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
                          <button type="button" style={{ background: 'transparent', border: 'none', color: '#00e5ff', fontSize: '12px', cursor: 'pointer' }} onClick={() => { setAuthMode('forgot'); setErrorMessage(''); setSuccessMessage(''); }}>
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
                      <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAuthMode('login')}>Back</button>
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
                      <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAuthMode('login')}>Back</button>
                      <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Send OTP</button>
                    </div>
                  </form>
                )}

                {/* 4. Reset Password OTP Screen */}
                {authMode === 'reset' && (
                  <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Create New Password</h3>
                    {successMessage && (
                      <p style={{ color: 'var(--accent-green)', fontSize: '13px', background: 'rgba(0, 230, 118, 0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0, 230, 118, 0.15)' }}>{successMessage}</p>
                    )}

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
                      <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAuthMode('login')}>Cancel</button>
                      <button type="submit" className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Reset Password</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* -------------------- AUTHENTICATED: SYSTEM WORKSPACE PORTAL -------------------- */}
      {isAuthenticated && user && (
        <div style={{ display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' }}>
          {/* Sidebar Navigation */}
          <aside style={{ width: '260px', background: 'rgba(6, 9, 19, 0.8)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                <Shield size={20} color="#00e5ff" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, letterSpacing: '1px', color: '#fff' }}>VORTEXA</span>
            </div>

            <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              {/* Renders Dashboard tab only for standard investors */}
              {user.role !== 'ADMIN' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'dashboard' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: activeTab === 'dashboard' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <LayoutDashboard size={18} />
                    Dashboard
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('staking')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'staking' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: activeTab === 'staking' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <Coins size={18} />
                    Staking Pools
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('wallet')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'wallet' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: activeTab === 'wallet' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <Wallet size={18} />
                    Wallet Integration
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('referrals')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'referrals' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: activeTab === 'referrals' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <Users size={18} />
                    Referral & MLM
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ai')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'ai' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: activeTab === 'ai' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <Cpu size={18} />
                    AI Arbitrage Monitor
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'notifications' ? 'rgba(0, 229, 255, 0.08)' : 'transparent', color: activeTab === 'notifications' ? '#00e5ff' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    <Bell size={18} />
                    Notification Center
                  </button>
                </>
              )}



              {user.role === 'ADMIN' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'admin' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: activeTab === 'admin' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
                  >
                    <Sliders size={18} />
                    Admin Panel
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('admin_users')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'admin_users' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: activeTab === 'admin_users' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
                  >
                    <Users size={18} />
                    Users Management
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('admin_logs')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'admin_logs' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: activeTab === 'admin_logs' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
                  >
                    <Shield size={18} />
                    Audit Security Logs
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', border: 'none', background: activeTab === 'notifications' ? 'rgba(213, 0, 249, 0.1)' : 'transparent', color: activeTab === 'notifications' ? '#d500f9' : 'var(--text-secondary)', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '14px', borderLeft: '3px solid #d500f9' }}
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
                    onClick={() => { setActiveTab('profile'); setShowAccountPopover(false); }}
                    style={{ background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', padding: '10px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <User size={15} />
                    View Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('update_password'); setShowAccountPopover(false); }}
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

          {/* Workspace Wrapper */}
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
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
                  onClick={() => setActiveTab('notifications')}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: activeTab === 'notifications' ? '#00e5ff' : 'var(--text-secondary)', position: 'relative', transition: 'all 0.2s' }}
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
                  <button type="button" className="btn-secondary" style={{ padding: '6px 16px', fontSize: '12.5px', borderRadius: '30px' }} onClick={connectWallet}>
                    <Wallet size={14} />
                    Connect Wallet
                  </button>
                )}
              </div>
            </header>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Volatility Alert */}
              {aiStatus.umbrellaRuleActive && (
                <div style={{ display: 'flex', gap: '16px', background: 'rgba(255, 23, 68, 0.08)', border: '1px solid rgba(255, 23, 68, 0.25)', padding: '20px', borderRadius: '16px' }}>
                  <AlertTriangle size={24} color="#ff1744" style={{ flexShrink: 0 }} />
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: '#ff1744', fontSize: '16px', marginBottom: '4px' }}>AI Umbrella Risk Protection Active</h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      Abnormal volatility &gt; 8% detected. Staking calculations and arbitrage bot runs consolidated safely to USDT capital pool.
                    </p>
                  </div>
                </div>
              )}

              {/* -------------------- 1. DASHBOARD TAB -------------------- */}
              {activeTab === 'dashboard' && user.role !== 'ADMIN' && (
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
              )}

              {/* -------------------- 2. STAKING TAB -------------------- */}
              {activeTab === 'staking' && user.role !== 'ADMIN' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    {stakingPools.map((pool) => (
                      <div key={pool.id} className="glass-panel interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                        <div>
                          <span className={`badge ${pool.id === 'flexible' ? 'badge-cyan' : 'badge-gold'}`} style={{ marginBottom: '12px' }}>
                            {pool.id === 'flexible' ? 'Flexible' : 'Locked'}
                          </span>
                          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{pool.name}</h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lock duration: {pool.lockDurationDays === 0 ? 'None' : `${pool.lockDurationDays} days`}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Staking APY</p>
                          <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                            {(pool.apy * 100).toFixed(0)}%
                          </h2>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: '12px', fontSize: '13px' }}
                            onClick={() => { setSelectedPoolId(pool.id); setStakeAmount(''); }}
                          >
                            Select Pool
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    <div className="glass-panel">
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Allocate Investment</h3>
                      {selectedPoolId ? (
                        <form onSubmit={handleStake} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected Pool:</span>{' '}
                            <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                              {stakingPools.find(p => p.id === selectedPoolId)?.name}
                            </span>
                          </div>
                          <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Amount to Stake (USDT)</label>
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Min 10 USDT"
                              value={stakeAmount}
                              onChange={(e) => setStakeAmount(e.target.value)}
                              required
                            />
                          </div>
                          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Stake Now</button>
                        </form>
                      ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>Please select a pool above.</p>
                      )}
                    </div>

                    <div className="glass-panel">
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>My Active Positions</h3>
                      {userPositions.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No active staking positions.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {userPositions.map((pos) => (
                            <div key={pos.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ fontWeight: 600 }}>{pos.pool_id === 'flexible' ? 'Flexible Pool' : `${pos.pool_id.replace('fixed', '')}-Day Fixed`}</h4>
                                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>Principal: {pos.amount} USDT | Yield: {(pos.apy * 100).toFixed(0)}% APY</p>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <p style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '15px' }}>+{pos.pendingRewards.toFixed(5)} USDT</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleClaimRewards(pos.id)}>Claim</button>
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,23,68,0.15)', border: '1px solid rgba(255,23,68,0.3)', color: '#ff1744', boxShadow: 'none' }}
                                    onClick={() => handleUnstake(pos.id)}
                                    disabled={!pos.isMatured && pos.pool_id !== 'flexible'}
                                  >
                                    Unstake
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- 3. WALLET TAB -------------------- */}
              {activeTab === 'wallet' && user.role !== 'ADMIN' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Web3 Wallet Connection</h3>
                    {balances.address ? (
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Linked Wallet</p>
                        <p style={{ fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', color: '#fff' }}>{balances.address}</p>
                      </div>
                    ) : (
                      <button type="button" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={connectWallet} disabled={isWalletConnecting}>
                        {isWalletConnecting ? 'Verifying Signature...' : 'Link Web3 Wallet'}
                      </button>
                    )}
                  </div>

                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Deposit & Withdraw</h3>
                    {balances.address ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Deposit USDT</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="number" className="form-control" placeholder="Amount" value={depositAmountInput} onChange={(e) => setDepositAmountInput(e.target.value)} />
                            <button type="button" className="btn-primary" onClick={handleDeposit}>Deposit</button>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Withdraw USDT</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="number" className="form-control" placeholder="Amount" value={withdrawAmountInput} onChange={(e) => setWithdrawAmountInput(e.target.value)} />
                            <button type="button" className="btn-primary" onClick={handleWithdraw}>Withdraw</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Please connect a Web3 wallet first.</p>
                    )}
                  </div>

                  {/* Transaction History Ledger */}
                  <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Transaction Audit History</h3>
                    {transactions.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>No transactions recorded.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Type</th>
                              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Amount</th>
                              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Status</th>
                              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Tx Hash</th>
                              <th style={{ textAlign: 'left', padding: '12px 8px' }}>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions.map((tx) => (
                              <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{tx.type}</td>
                                <td style={{ padding: '12px 8px' }}>{tx.amount.toFixed(2)} USDT</td>
                                <td style={{ padding: '12px 8px' }}>
                                  <span className={`badge ${tx.status === 'COMPLETED' ? 'badge-green' : tx.status === 'PENDING' ? 'badge-gold' : 'badge-red'}`}>
                                    {tx.status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-8)}
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                  {new Date(tx.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------- 4. REFERRALS TAB -------------------- */}
              {activeTab === 'referrals' && user.role !== 'ADMIN' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Referral Network</h3>
                    <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Your Referral Code</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)' }}>{user.refCode}</span>
                        <button type="button" className="btn-secondary" style={{ padding: '6px' }} onClick={() => { navigator.clipboard.writeText(user.refCode); showNotificationAlert('Copied!', 'Referral code copied to clipboard.', 'success'); }}>
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
              )}

              {/* -------------------- 5. AI ENGINE MONITOR TAB -------------------- */}
              {activeTab === 'ai' && user.role !== 'ADMIN' && (
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                  <div className="glass-panel">
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Arbitrage scanner activity</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Asset</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Buy Dex</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Sell Dex</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Spread</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiStatus.recentTrades.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 600 }}>{t.dex_pair}</td>
                              <td style={{ padding: '10px 8px', color: 'var(--accent-cyan)' }}>{t.buy_dex}</td>
                              <td style={{ padding: '10px 8px', color: 'var(--accent-purple)' }}>{t.sell_dex}</td>
                              <td style={{ padding: '10px 8px', color: 'var(--accent-green)' }}>+{(t.profit_percentage * 100).toFixed(3)}%</td>
                              <td style={{ padding: '10px 8px', fontWeight: 600 }}>{t.profit_amount.toFixed(4)} USDT</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Core Statistics</h3>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Engine Status</p>
                      <span className={`badge ${aiStatus.status === 'RUNNING' ? 'badge-green' : 'badge-red'}`}>
                        {aiStatus.status}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-secondary)' }}>DEX Price Spread Analyzer</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Uniswap ETH:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${dexPrices.prices.uniswap.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Sushiswap ETH:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${dexPrices.prices.sushiswap.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Curve ETH:</span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${dexPrices.prices.curve.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- 6. PROFILE TAB -------------------- */}
              {activeTab === 'profile' && (
                !profile ? (
                  <div className="glass-panel animate-fade-in" style={{ width: '100%', textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading profile parameters...</p>
                  </div>
                ) : (
                  <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', width: '100%' }}>
                    {/* Left Column: Summary Info */}
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '24px', borderRadius: '50%', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
                        <User size={64} color="#00e5ff" />
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

                        <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>Save Profile Changes</button>
                      </form>
                    </div>
                  </div>
                )
              )}

              {/* -------------------- 6.1 UPDATE PASSWORD TAB -------------------- */}
              {activeTab === 'update_password' && (
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

                      <button type="submit" className="btn-primary" style={{ justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-purple) 0%, #aa00ff 100%)', boxShadow: '0 4px 14px 0 rgba(213, 0, 249, 0.25)', marginTop: '8px' }}>
                        Confirm Password Change
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* -------------------- 6.2 NOTIFICATION CENTER TAB -------------------- */}
              {activeTab === 'notifications' && (
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
              )}

              {/* -------------------- 7. ADMIN PORTAL TAB -------------------- */}
              {activeTab === 'admin' && user.role === 'ADMIN' && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel">
                      <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Registered Users</p>
                      <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: '6px' }}>{adminStats.totalUsers}</h3>
                    </div>
                    <div className="glass-panel">
                      <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Total Deposited</p>
                      <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '6px' }}>{adminStats.totalDepositedUSDT.toFixed(2)} USDT</h3>
                    </div>
                    <div className="glass-panel">
                      <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Total Approved Outflow</p>
                      <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-purple)', marginTop: '6px' }}>{adminStats.totalWithdrawnUSDT.toFixed(2)} USDT</h3>
                    </div>
                    <div className="glass-panel">
                      <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>Total System Assets</p>
                      <h3 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: '6px' }}>{adminStats.systemBalances.totalEquity.toFixed(2)} USDT</h3>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>AI Engine Configuration</h3>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="button" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => toggleAIEngine('RUNNING')} disabled={aiStatus.status === 'RUNNING'}>Start Bot</button>
                        <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', color: '#ff1744' }} onClick={() => toggleAIEngine('PAUSED')} disabled={aiStatus.status === 'PAUSED'}>Pause Bot</button>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Simulate Volatility Spill</h4>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="number" step="0.01" className="form-control" placeholder="Enter Volatility" value={volatilityInput} onChange={(e) => setVolatilityInput(e.target.value)} />
                          <button type="button" className="btn-secondary" onClick={handleAdjustVolatility}>Set</button>
                        </div>
                      </div>
                    </div>

                    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Escrow Withdrawal Authorizations</h3>
                      <div>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Admin Security PIN</label>
                        <input type="password" className="form-control" placeholder="Enter PIN (9999)" value={adminPinInput} onChange={(e) => setAdminPinInput(e.target.value)} />
                      </div>

                      {adminPendingWithdrawals.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center' }}>No pending authorizations.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
                          {adminPendingWithdrawals.map((w) => (
                            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{w.username}</span>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Amount: {w.amount} USDT</p>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="button" className="btn-primary" style={{ padding: '4px 10px', fontSize: '11.5px', boxShadow: 'none' }} onClick={() => approveWithdrawal(w.id)}>Approve</button>
                                <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11.5px', color: '#ff1744' }} onClick={() => rejectWithdrawal(w.id)}>Reject</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- 8. ADMIN USERS MANAGEMENT TAB -------------------- */}
              {activeTab === 'admin_users' && user.role === 'ADMIN' && (
                <div className="glass-panel animate-fade-in">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>System Users Directory</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 8px' }}>Username</th>
                          <th style={{ textAlign: 'left', padding: '10px 8px' }}>Role</th>
                          <th style={{ textAlign: 'left', padding: '10px 8px' }}>Referral Code</th>
                          <th style={{ textAlign: 'left', padding: '10px 8px' }}>USDT Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsersList.map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>{u.username}</td>
                            <td style={{ padding: '10px 8px' }}><span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : 'badge-cyan'}`}>{u.role}</span></td>
                            <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{u.refCode}</td>
                            <td style={{ padding: '10px 8px' }}>{u.balanceUSDT.toFixed(2)} USDT</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* -------------------- 9. ADMIN AUDIT SECURITY LOGS TAB -------------------- */}
              {activeTab === 'admin_logs' && user.role === 'ADMIN' && (
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
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
