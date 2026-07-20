import { run, get, all, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '../utils/logger';
import ReferralService from './referral';
import crypto from 'crypto';

export interface StakingPool {
  id: string;
  name: string;
  apy: number;
  lockDurationDays: number;
}

export const STAKING_POOLS: Record<string, StakingPool> = {
  flexible: { id: 'flexible', name: 'Flexible Yield Pool', apy: 0.06, lockDurationDays: 0 },
  fixed30: { id: 'fixed30', name: 'Fixed 30-Day Pool', apy: 0.12, lockDurationDays: 30 },
  fixed90: { id: 'fixed90', name: 'Fixed 90-Day Pool', apy: 0.18, lockDurationDays: 90 },
  locked180: { id: 'locked180', name: 'VIP Locked 180-Day Pool', apy: 0.24, lockDurationDays: 180 },
};

export interface StakingPositionRaw {
  id: string;
  user_id: string;
  pool_id: string;
  amount: number;
  apy: number;
  started_at: string;
  matures_at: string;
  status: 'STAKING' | 'WITHDRAWN';
  accrued_rewards: number;
}

export interface StakingPositionDetails extends StakingPositionRaw {
  pendingRewards: number;
  isMatured: boolean;
  timeRemainingSeconds: number;
}

class StakingSystem {
  /**
   * Helper to calculate accrued interest for a staking position.
   */
  public calculatePendingRewards(position: StakingPositionRaw): number {
    if (position.status !== 'STAKING') return 0;

    const startedTime = new Date(position.started_at).getTime();
    const now = Date.now();
    const elapsedMs = now - startedTime;
    const yearMs = 365 * 24 * 60 * 60 * 1000;

    // Simple interest model: Amount * APY * (Time elapsed / 1 Year)
    const accrued = position.amount * position.apy * (elapsedMs / yearMs);
    return Number(accrued.toFixed(6));
  }

  /**
   * Fetch all active staking positions for a user with computed pending rewards.
   */
  public async getUserPositions(userId: string): Promise<StakingPositionDetails[]> {
    const rawPositions = await all<StakingPositionRaw>(
      'SELECT * FROM staking_positions WHERE user_id = ? AND status = "STAKING"',
      [userId]
    );

    const now = Date.now();
    return rawPositions.map((pos) => {
      const pendingRewards = this.calculatePendingRewards(pos);
      const maturesTime = new Date(pos.matures_at).getTime();
      const isMatured = now >= maturesTime;
      const timeRemainingSeconds = Math.max(0, Math.floor((maturesTime - now) / 1000));

      return {
        ...pos,
        pendingRewards,
        isMatured,
        timeRemainingSeconds,
      };
    });
  }

  /**
   * Allocate funds to a staking pool.
   */
  public async stakeFunds(userId: string, poolId: string, amount: number): Promise<string> {
    const pool = STAKING_POOLS[poolId];
    if (!pool) throw new Error('Invalid staking pool');

    return await transaction(async () => {
      // 1. Check user has enough USDT balance
      const wallet = await get<{ balance_usdt: number }>('SELECT balance_usdt FROM wallets WHERE user_id = ?', [userId]);
      if (!wallet || wallet.balance_usdt < amount) {
        throw new Error('Insufficient balance to stake');
      }

      const id = uuidv4();
      const now = new Date();
      const maturesAt = new Date();
      maturesAt.setDate(now.getDate() + pool.lockDurationDays);

      // 2. Deduct from wallet balance and transfer to staked balance
      await run(
        'UPDATE wallets SET balance_usdt = balance_usdt - ?, staked_usdt = staked_usdt + ? WHERE user_id = ?',
        [amount, amount, userId]
      );

      // 3. Create staking position record
      await run(
        'INSERT INTO staking_positions (id, user_id, pool_id, amount, apy, started_at, matures_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, poolId, amount, pool.apy, now.toISOString(), maturesAt.toISOString(), 'STAKING']
      );

      // 4. Log transaction
      const txHash = '0x' + crypto.randomBytes(32).toString('hex');
      await run(
        'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, 'STAKE', amount, 'COMPLETED', txHash]
      );

      await logAudit(userId, 'STAKE_SUCCESS', `Staked ${amount} USDT into pool: ${pool.name}. Position ID: ${id}`);
      return id;
    });
  }

  /**
   * Claim accumulated staking rewards and add to user balance.
   */
  public async claimRewards(userId: string, positionId: string): Promise<number> {
    return await transaction(async () => {
      const position = await get<StakingPositionRaw>(
        'SELECT * FROM staking_positions WHERE id = ? AND user_id = ? AND status = "STAKING"',
        [positionId, userId]
      );

      if (!position) throw new Error('Active staking position not found');

      const pendingRewards = this.calculatePendingRewards(position);
      if (pendingRewards <= 0) return 0;

      // 1. Credit rewards to wallet balance
      await run(
        'UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?',
        [pendingRewards, userId]
      );

      // 2. Reset position timer and save historical rewards
      const now = new Date().toISOString();
      await run(
        'UPDATE staking_positions SET started_at = ?, accrued_rewards = accrued_rewards + ? WHERE id = ?',
        [now, pendingRewards, positionId]
      );

      // 3. Log transaction
      const txHash = '0x' + crypto.randomBytes(32).toString('hex');
      await run(
        'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, 'ARBITRAGE_PROFIT', pendingRewards, 'COMPLETED', txHash] // Recorded as reward profit
      );

      // Distribute passive flow MLM income
      await ReferralService.distributePassiveFlowIncome(userId, pendingRewards);

      await logAudit(userId, 'STAKE_CLAIM_REWARDS', `Claimed ${pendingRewards} USDT rewards from position ${positionId}`);
      return pendingRewards;
    });
  }

  /**
   * Unstake funds (mature pools only, flexible can unstake anytime).
   */
  public async unstakeFunds(userId: string, positionId: string): Promise<{ principal: number; rewards: number }> {
    return await transaction(async () => {
      const position = await get<StakingPositionRaw>(
        'SELECT * FROM staking_positions WHERE id = ? AND user_id = ? AND status = "STAKING"',
        [positionId, userId]
      );

      if (!position) throw new Error('Active staking position not found');

      const now = Date.now();
      const maturesTime = new Date(position.matures_at).getTime();
      const isMatured = now >= maturesTime;

      // Flexible positions have no lockup period, so they can unstake at any time
      if (!isMatured && position.pool_id !== 'flexible') {
        throw new Error('Staking position has not matured yet and cannot be unstaked');
      }

      const pendingRewards = this.calculatePendingRewards(position);
      const totalPayout = position.amount + pendingRewards;

      // 1. Deduct from staked_usdt, add total to balance_usdt
      await run(
        'UPDATE wallets SET balance_usdt = balance_usdt + ?, staked_usdt = staked_usdt - ? WHERE user_id = ?',
        [totalPayout, position.amount, userId]
      );

      // 2. Update staking position status to WITHDRAWN
      await run(
        'UPDATE staking_positions SET status = "WITHDRAWN", accrued_rewards = accrued_rewards + ? WHERE id = ?',
        [pendingRewards, positionId]
      );

      // 3. Log transaction
      const txHash = '0x' + crypto.randomBytes(32).toString('hex');
      await run(
        'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, 'UNSTAKE', position.amount, 'COMPLETED', txHash]
      );

      // Distribute passive flow MLM income if rewards earned
      if (pendingRewards > 0) {
        await ReferralService.distributePassiveFlowIncome(userId, pendingRewards);
      }

      await logAudit(userId, 'UNSTAKE_SUCCESS', `Unstaked position ${positionId}. Principal: ${position.amount} USDT, Rewards: ${pendingRewards} USDT`);

      return {
        principal: position.amount,
        rewards: pendingRewards,
      };
    });
  }
}

export const StakingService = new StakingSystem();
export default StakingService;
