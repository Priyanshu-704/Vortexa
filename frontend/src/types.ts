export interface User {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
  refCode: string;
}

export interface Balances {
  address: string;
  balanceUSDT: number;
  stakedUSDT: number;
  walletUSDTBalance: number;
  totalEquity: number;
}

export interface StakingPool {
  id: string;
  name: string;
  apy: number;
  lockDurationDays: number;
}

export interface StakingPosition {
  id: string;
  pool_id: string;
  amount: number;
  apy: number;
  pendingRewards: number;
  isMatured: boolean;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'STAKE' | 'UNSTAKE' | 'ARBITRAGE_PROFIT' | 'REFERRAL_BONUS';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  tx_hash: string;
  created_at: string;
}

export interface ReferralStats {
  referredCount: number;
  directReferrals: any[];
  totalEarnedUSDT: number;
}

export interface AiStatus {
  status: 'RUNNING' | 'PAUSED';
  umbrellaRuleActive: boolean;
  currentVolatility: number;
  totalExecutedTrades: number;
  totalProfitUSDT: number;
  recentTrades: any[];
}

export interface DexPrices {
  prices: {
    uniswap: number;
    sushiswap: number;
    curve: number;
  };
}

export interface ProfileData {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: string;
  displayName: string;
  avatar: string;
  timezone: string;
  notificationPrefs: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

export interface AdminStats {
  totalUsers: number;
  totalDepositedUSDT: number;
  totalWithdrawnUSDT: number;
  systemBalances: {
    totalUSDT: number;
    totalStakedUSDT: number;
    totalEquity: number;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  role: 'USER' | 'ADMIN';
  refCode: string;
  balanceUSDT: number;
}

export interface PendingWithdrawal {
  id: string;
  username: string;
  amount: number;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  created_at: string;
}
