import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { all, get, run, transaction } from '../db';
import { logAudit } from '../utils/logger';
import { decrypt, encrypt } from '../utils/crypto';
import Web3Service from '../services/web3';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock hashed Admin PIN for sensitive action confirmations: e.g. "9999" (hashed via bcrypt/sha256 or simply matched)
const SECURE_ADMIN_PIN = '9999';

// Helper middleware for secondary admin authentication (passcode validation)
function verifyAdminPin(req: any, res: Response, next: any) {
  const adminPin = req.headers['x-admin-pin'] || req.body.adminPin;
  if (!adminPin || adminPin !== SECURE_ADMIN_PIN) {
    return res.status(403).json({ error: 'Multi-Factor Verification Failed: Invalid Admin Security PIN' });
  }
  next();
}

// 1. Get system overview stats
router.get('/stats', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalUsers = await get<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE role = "USER"');
    const totalDeposits = await get<{ total: number }>('SELECT SUM(amount) as total FROM transactions WHERE type = "DEPOSIT" AND status = "COMPLETED"');
    const totalWithdrawals = await get<{ total: number }>('SELECT SUM(amount) as total FROM transactions WHERE type = "WITHDRAWAL" AND status = "COMPLETED"');
    const systemUSDT = await get<{ total: number }>('SELECT SUM(balance_usdt) as total FROM wallets');
    const systemStaked = await get<{ total: number }>('SELECT SUM(staked_usdt) as total FROM wallets');

    return res.json({
      totalUsers: totalUsers?.count || 0,
      totalDepositedUSDT: totalDeposits?.total || 0,
      totalWithdrawnUSDT: totalWithdrawals?.total || 0,
      systemBalances: {
        totalUSDT: systemUSDT?.total || 0,
        totalStakedUSDT: systemStaked?.total || 0,
        totalEquity: (systemUSDT?.total || 0) + (systemStaked?.total || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. List all users with balance details and decrypted wallet addresses
router.get('/users', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await all<{ id: string; username: string; role: string; ref_code: string; address: string; balance_usdt: number; staked_usdt: number }>(
      `SELECT u.id, u.username, u.role, u.ref_code, w.address, w.balance_usdt, w.staked_usdt 
       FROM users u 
       LEFT JOIN wallets w ON u.id = w.user_id`
    );

    const decryptedUsers = users.map((u) => {
      let decryptedAddress = null;
      if (u.address) {
        try {
          decryptedAddress = decrypt(u.address);
        } catch {
          decryptedAddress = u.address;
        }
      }
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        refCode: u.ref_code,
        walletAddress: decryptedAddress,
        balanceUSDT: u.balance_usdt,
        stakedUSDT: u.staked_usdt,
      };
    });

    return res.json({ users: decryptedUsers });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. List all pending withdrawal requests
router.get('/withdrawals/pending', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const withdrawals = await all<{ id: string; username: string; amount: number; status: string; tx_hash: string; created_at: string }>(
      `SELECT t.id, u.username, t.amount, t.status, t.tx_hash, t.created_at 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.type = "WITHDRAWAL" AND t.status = "PENDING"
       ORDER BY t.created_at DESC`
    );

    return res.json({ withdrawals });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Approve pending withdrawal (requires X-Admin-Pin)
router.post('/withdrawals/approve', authenticateToken, requireRole(['ADMIN']), verifyAdminPin, async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    const tx = await get<{ user_id: string; amount: number; status: string }>('SELECT user_id, amount, status FROM transactions WHERE id = ?', [transactionId]);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'PENDING') return res.status(400).json({ error: 'Transaction is not in pending state' });

    // Fetch user's encrypted wallet address
    const wallet = await get<{ address: string }>('SELECT address FROM wallets WHERE user_id = ?', [tx.user_id]);
    if (!wallet || !wallet.address) {
      return res.status(400).json({ error: 'User does not have a linked wallet address' });
    }

    const userWalletAddress = decrypt(wallet.address);

    await transaction(async () => {
      // Transfer USDT on mock blockchain
      const treasuryAddress = '0x9999999999999999999999999999999999999999';
      const mockChainTx = await Web3Service.simulateUSDTTransfer(treasuryAddress, userWalletAddress, tx.amount);

      const encryptedTxHash = encrypt(mockChainTx.hash);

      // Update transaction status to COMPLETED
      await run(
        'UPDATE transactions SET status = "COMPLETED", tx_hash = ? WHERE id = ?',
        [encryptedTxHash, transactionId]
      );

      await logAudit(
        req.user!.id,
        'ADMIN_APPROVE_WITHDRAWAL',
        `Approved withdrawal of ${tx.amount} USDT for user ${tx.user_id}. TX Hash: ${mockChainTx.hash}`
      );
    });

    return res.json({ message: 'Withdrawal approved successfully' });
  } catch (error: any) {
    console.error('Approve withdrawal error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 5. Reject pending withdrawal
router.post('/withdrawals/reject', authenticateToken, requireRole(['ADMIN']), verifyAdminPin, async (req: AuthenticatedRequest, res: Response) => {
  const { transactionId, reason } = req.body;

  if (!transactionId) {
    return res.status(400).json({ error: 'Transaction ID is required' });
  }

  try {
    const tx = await get<{ user_id: string; amount: number; status: string }>('SELECT user_id, amount, status FROM transactions WHERE id = ?', [transactionId]);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.status !== 'PENDING') return res.status(400).json({ error: 'Transaction is not in pending state' });

    await transaction(async () => {
      // Refund user wallet escrow
      await run(
        'UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?',
        [tx.amount, tx.user_id]
      );

      // Mark transaction status to REJECTED
      await run(
        'UPDATE transactions SET status = "REJECTED" WHERE id = ?',
        [transactionId]
      );

      await logAudit(
        req.user!.id,
        'ADMIN_REJECT_WITHDRAWAL',
        `Rejected withdrawal of ${tx.amount} USDT for user ${tx.user_id}. Reason: ${reason || 'None provided'}`
      );
    });

    return res.json({ message: 'Withdrawal rejected and refunded successfully' });
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Get Audit Logs (ordered chronologically)
router.get('/audit-logs', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await all<{ id: string; username: string | null; action: string; details: string; ip_address: string | null; created_at: string }>(
      `SELECT a.id, u.username, a.action, a.details, a.ip_address, a.created_at 
       FROM audit_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC LIMIT 100`
    );

    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
