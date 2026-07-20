import { run, get, all, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '../utils/logger';

// Reward rates configuration
const DEPOSIT_BONUS_RATES = [0.05, 0.03, 0.01]; // Level 1: 5%, Level 2: 3%, Level 3: 1%
const PASSIVE_FLOW_RATES = [0.10, 0.05, 0.02];  // Level 1: 10% of referee earnings, Level 2: 5%, Level 3: 2%

class ReferralSystem {
  /**
   * Traverses up to 3 levels of referrers for a given user.
   * Returns list of user IDs starting from direct referrer (Level 1) to Level 3.
   */
  public async getReferrerChain(userId: string): Promise<string[]> {
    const chain: string[] = [];
    let currentUserId = userId;

    for (let i = 0; i < 3; i++) {
      const user = await get<{ referred_by: string | null }>('SELECT referred_by FROM users WHERE id = ?', [currentUserId]);
      if (!user || !user.referred_by) {
        break;
      }
      chain.push(user.referred_by);
      currentUserId = user.referred_by;
    }

    return chain;
  }

  /**
   * Distributes direct business and multi-level deposit bonuses (Phase 5).
   * Executed within an existing or new database transaction.
   */
  public async distributeDepositBonuses(userId: string, depositAmount: number): Promise<void> {
    const referrers = await this.getReferrerChain(userId);
    if (referrers.length === 0) return;

    await transaction(async () => {
      for (let level = 0; level < referrers.length; level++) {
        const referrerId = referrers[level];
        const rate = DEPOSIT_BONUS_RATES[level];
        const bonusAmount = Number((depositAmount * rate).toFixed(6));

        if (bonusAmount <= 0) continue;

        // Credit to referrer's wallet
        await run(
          'UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?',
          [bonusAmount, referrerId]
        );

        // Record transaction
        const txHash = '0x' + Math.random().toString(36).substring(2, 10).toUpperCase() + 'MOCKREFBONUS';
        await run(
          'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), referrerId, 'REFERRAL_BONUS', bonusAmount, 'COMPLETED', txHash]
        );

        await logAudit(
          referrerId,
          'REFERRAL_BONUS_RECEIVED',
          `Received Level ${level + 1} deposit bonus of ${bonusAmount} USDT from referee deposit of ${depositAmount} USDT (User: ${userId})`
        );
      }
    });
  }

  /**
   * Distributes passive flow income based on referee staking earnings.
   */
  public async distributePassiveFlowIncome(userId: string, earnedAmount: number): Promise<void> {
    const referrers = await this.getReferrerChain(userId);
    if (referrers.length === 0) return;

    await transaction(async () => {
      for (let level = 0; level < referrers.length; level++) {
        const referrerId = referrers[level];
        const rate = PASSIVE_FLOW_RATES[level];
        const passiveIncome = Number((earnedAmount * rate).toFixed(6));

        if (passiveIncome <= 0) continue;

        // Credit to referrer's wallet
        await run(
          'UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?',
          [passiveIncome, referrerId]
        );

        // Record transaction
        const txHash = '0x' + Math.random().toString(36).substring(2, 10).toUpperCase() + 'MOCKPASSIVE';
        await run(
          'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), referrerId, 'REFERRAL_BONUS', passiveIncome, 'COMPLETED', txHash]
        );

        await logAudit(
          referrerId,
          'PASSIVE_INCOME_RECEIVED',
          `Received Level ${level + 1} Passive Flow income of ${passiveIncome} USDT from referee staking yield of ${earnedAmount} USDT (User: ${userId})`
        );
      }
    });
  }

  /**
   * Fetch referral analytics for user dashboard.
   */
  public async getReferralStats(userId: string) {
    // Direct referrals (Level 1)
    const directReferrals = await all<{ id: string; username: string; created_at: string }>(
      'SELECT id, username, created_at FROM users WHERE referred_by = ?',
      [userId]
    );

    // Total referral rewards earned
    const totalRewards = await get<{ total: number }>(
      'SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = "REFERRAL_BONUS" AND status = "COMPLETED"',
      [userId]
    );

    return {
      referredCount: directReferrals.length,
      directReferrals: directReferrals.map((r: { username: string; created_at: string }) => ({ username: r.username, joinedAt: r.created_at })),
      totalEarnedUSDT: totalRewards?.total || 0,
    };
  }
}

export const ReferralService = new ReferralSystem();
export default ReferralService;
