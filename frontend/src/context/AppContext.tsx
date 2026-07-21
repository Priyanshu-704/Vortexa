import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User, Balances, AiStatus, ProfileData, Notification } from '../types';
import Swal from 'sweetalert2';

interface AppContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  token: string | null;
  setToken: (val: string | null) => void;
  user: User | null;
  setUser: (val: User | null) => void;
  profile: ProfileData | null;
  setProfile: (val: ProfileData | null) => void;
  balances: Balances;
  setBalances: React.Dispatch<React.SetStateAction<Balances>>;
  aiStatus: AiStatus;
  setAiStatus: React.Dispatch<React.SetStateAction<AiStatus>>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  logout: () => Promise<void>;
  fetchBalance: () => Promise<void>;
  fetchAIStatus: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  getHeaders: () => { 'Content-Type': string; Authorization: string };
  API_BASE: string;
  showNotificationAlert: (title: string, text: string, icon?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE = 'http://localhost:5000/api';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [balances, setBalances] = useState<Balances>({ address: '', balanceUSDT: 0, stakedUSDT: 0, walletUSDTBalance: 0, totalEquity: 0 });
  const [aiStatus, setAiStatus] = useState<AiStatus>({ status: 'PAUSED', umbrellaRuleActive: false, currentVolatility: 0.02, totalExecutedTrades: 0, totalProfitUSDT: 0, recentTrades: [] });
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'INFO', message: 'Welcome to Vortexa DeFi & AI Portal!', created_at: new Date().toISOString() },
    { id: '2', type: 'SECURITY', message: 'Logged in successfully from IP 127.0.0.1', created_at: new Date().toISOString() }
  ]);

  const scanInterval = useRef<NodeJS.Timeout | null>(null);

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

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchBalance = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/wallet/balance`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setBalances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAIStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/status`);
      const data = await res.json();
      if (res.ok) setAiStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/profile`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setProfile(data.profile);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    // Currently fallback mockup logs or can fetch from API if exists
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: getHeaders() });
    } catch (err) {}
    localStorage.removeItem('vortexa_token');
    localStorage.removeItem('vortexa_user');
    setToken(null);
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  };

  // Mount/Session check
  useEffect(() => {
    const savedToken = localStorage.getItem('vortexa_token');
    const savedUser = localStorage.getItem('vortexa_user');
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsedUser);
      setIsAuthenticated(true);
    }
  }, []);

  // Polling loop when token changes
  useEffect(() => {
    if (token) {
      fetchBalance();
      fetchAIStatus();
      fetchProfile();

      scanInterval.current = setInterval(() => {
        fetchBalance();
        fetchAIStatus();
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

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        token,
        setToken,
        user,
        setUser,
        profile,
        setProfile,
        balances,
        setBalances,
        aiStatus,
        setAiStatus,
        notifications,
        setNotifications,
        logout,
        fetchBalance,
        fetchAIStatus,
        fetchProfile,
        fetchNotifications,
        getHeaders,
        API_BASE,
        showNotificationAlert
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
