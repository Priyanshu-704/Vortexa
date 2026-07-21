import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useApp } from './AppContext';
import type { AdminStats, AdminUser, PendingWithdrawal, AuditLog } from '../types';
import Swal from 'sweetalert2';

interface AdminContextType {
  adminStats: AdminStats;
  adminUsersList: AdminUser[];
  adminPendingWithdrawals: PendingWithdrawal[];
  adminAuditLogs: AuditLog[];
  fetchAdminData: () => Promise<void>;
  toggleAIEngine: (status: 'RUNNING' | 'PAUSED') => Promise<void>;
  adjustVolatility: (volatility: string) => Promise<void>;
  approveWithdrawal: (txId: string) => Promise<void>;
  rejectWithdrawal: (txId: string) => Promise<void>;
  adminPinInput: string;
  setAdminPinInput: (val: string) => void;
  volatilityInput: string;
  setVolatilityInput: (val: string) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { getHeaders, API_BASE, fetchAIStatus, showNotificationAlert } = useApp();

  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDepositedUSDT: 0,
    totalWithdrawnUSDT: 0,
    systemBalances: { totalUSDT: 0, totalStakedUSDT: 0, totalEquity: 0 }
  });
  const [adminUsersList, setAdminUsersList] = useState<AdminUser[]>([]);
  const [adminPendingWithdrawals, setAdminPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AuditLog[]>([]);

  const [adminPinInput, setAdminPinInput] = useState('');
  const [volatilityInput, setVolatilityInput] = useState('0.02');

  const adminInterval = useRef<NodeJS.Timeout | null>(null);

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
        fetchAdminData();
        showNotificationAlert('AI Engine Update', data.message, 'success');
      } else {
        showNotificationAlert('Error', data.error, 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const adjustVolatility = async (vol: string) => {
    const parsedVal = parseFloat(vol);
    if (isNaN(parsedVal) || parsedVal < 0 || parsedVal > 1) {
      showNotificationAlert('Invalid Volatility', 'Enter a volatility metric between 0 and 1', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/ai/volatility`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ volatility: parsedVal })
      });
      const data = await res.json();
      if (res.ok) {
        setVolatilityInput(vol);
        fetchAIStatus();
        fetchAdminData();
        showNotificationAlert('Volatility Updated!', data.message, 'success');
      } else {
        showNotificationAlert('Error', data.error, 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const approveWithdrawal = async (txId: string) => {
    if (!adminPinInput) {
      showNotificationAlert('PIN Code Required', 'Please enter your Admin Security PIN to confirm.', 'warning');
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
        showNotificationAlert('Withdrawal Approved', data.message, 'success');
      } else {
        showNotificationAlert('Error', data.error, 'error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const rejectWithdrawal = async (txId: string) => {
    if (!adminPinInput) {
      showNotificationAlert('PIN Code Required', 'Please enter your Admin Security PIN to confirm.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Enter Rejection Reason',
      input: 'text',
      inputPlaceholder: 'Reason for rejection...',
      showCancelButton: true,
      background: '#0d1426',
      color: '#fff',
      confirmButtonColor: '#ff1744',
      cancelButtonColor: '#3085d6'
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

  useEffect(() => {
    fetchAdminData();
    adminInterval.current = setInterval(fetchAdminData, 5000);
    return () => {
      if (adminInterval.current) {
        clearInterval(adminInterval.current);
      }
    };
  }, []);

  return (
    <AdminContext.Provider
      value={{
        adminStats,
        adminUsersList,
        adminPendingWithdrawals,
        adminAuditLogs,
        fetchAdminData,
        toggleAIEngine,
        adjustVolatility,
        approveWithdrawal,
        rejectWithdrawal,
        adminPinInput,
        setAdminPinInput,
        volatilityInput,
        setVolatilityInput
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
