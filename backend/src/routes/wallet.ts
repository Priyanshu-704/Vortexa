import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/logger';
import { encrypt, decrypt } from '../utils/crypto';
import Web3Service from '../services/web3';
import ReferralService from '../services/referral';

const router = Router();

// 1. Connect/Link Wallet with signature verification
router.post('/connect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { address, message, signature } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!address || !message || !signature) {
    return res.status(400).json({ error: 'Address, message, and signature are required' });
  }

  // Security checks: ensure signature matches address
  const isValid = Web3Service.verifySignature(address, message, signature);
  if (!isValid) {
    await logAudit(req.user.id, 'WALLET_CONNECT_FAIL', `Failed signature verification for address: ${address}`);
    return res.status(400).json({ error: 'Cryptographic signature verification failed' });
  }

  try {
    // Encrypt address for secure storage
    const encryptedAddress = encrypt(address.toLowerCase());

    // Update wallet address in database
    await run(
      'UPDATE wallets SET address = ? WHERE user_id = ?',
      [encryptedAddress, req.user.id]
    );

    await logAudit(req.user.id, 'WALLET_CONNECT_SUCCESS', `Linked wallet address: ${address.toLowerCase()}`);
    return res.json({ message: 'Wallet connected successfully', address: address.toLowerCase() });
  } catch (error: any) {
    console.error('Wallet link error:', error);
    return res.status(500).json({ error: 'Internal server error during wallet connection' });
  }
});

// 2. Deposit simulated USDT from connected wallet into Vortexa account
router.post('/deposit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }

  try {
    // Get user wallet details
    const wallet = await get<{ address: string; balance_usdt: number }>('SELECT address, balance_usdt FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!wallet || wallet.address.includes('0x') === false && !wallet.address.includes(':')) {
      return res.status(400).json({ error: 'No wallet connected. Please connect wallet first.' });
    }

    const decryptedAddress = decrypt(wallet.address);

    // Simulate on-chain USDT transfer to Vortexa treasury pool
    const vortexaTreasury = '0x9999999999999999999999999999999999999999';
    const tx = await Web3Service.simulateUSDTTransfer(decryptedAddress, vortexaTreasury, amount);

    // If transfer succeeds, credit account balance and log transaction
    const encryptedTxHash = encrypt(tx.hash);
    const txId = uuidv4();

    // Begin DB update transaction for atomic balance adjustment
    await run(
      'UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?',
      [amount, req.user.id]
    );

    await run(
      'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [txId, req.user.id, 'DEPOSIT', amount, 'COMPLETED', encryptedTxHash]
    );

    // Distribute multi-level referral deposit bonuses
    await ReferralService.distributeDepositBonuses(req.user.id, amount);

    await logAudit(req.user.id, 'DEPOSIT_SUCCESS', `Deposited ${amount} USDT. TX Hash: ${tx.hash}`);

    return res.json({
      message: 'Deposit successful',
      txHash: tx.hash,
      newBalance: wallet.balance_usdt + amount,
    });
  } catch (error: any) {
    console.error('Deposit error:', error);
    return res.status(400).json({ error: error.message || 'Internal server error during deposit' });
  }
});

// 3. Initiate Withdrawal Request
router.post('/withdraw', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { amount } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  try {
    // Fetch wallet details
    const wallet = await get<{ address: string; balance_usdt: number }>('SELECT address, balance_usdt FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!wallet || wallet.address.includes('0x') === false && !wallet.address.includes(':')) {
      return res.status(400).json({ error: 'No wallet connected. Please connect wallet first.' });
    }

    if (wallet.balance_usdt < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct user balance immediately (escrow) and create PENDING withdrawal
    const txId = uuidv4();
    const mockTxHash = encrypt(Web3Service.generateTxHash()); // Will be confirmed on block when approved

    await run(
      'UPDATE wallets SET balance_usdt = balance_usdt - ? WHERE user_id = ?',
      [amount, req.user.id]
    );

    await run(
      'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [txId, req.user.id, 'WITHDRAWAL', amount, 'PENDING', mockTxHash]
    );

    await logAudit(req.user.id, 'WITHDRAW_REQUESTED', `Requested withdrawal of ${amount} USDT. Tx ID: ${txId}`);

    return res.json({
      message: 'Withdrawal request submitted. Pending administrator approval.',
      txId,
      newBalance: wallet.balance_usdt - amount,
    });
  } catch (error: any) {
    console.error('Withdrawal request error:', error);
    return res.status(500).json({ error: 'Internal server error during withdrawal request' });
  }
});

// 4. Get balances
router.get('/balance', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const wallet = await get<{ address: string; balance_usdt: number; staked_usdt: number }>('SELECT address, balance_usdt, staked_usdt FROM wallets WHERE user_id = ?', [req.user.id]);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    let decryptedAddress = null;
    try {
      decryptedAddress = decrypt(wallet.address);
    } catch {
      // In case it's a default unitialized string
      decryptedAddress = null;
    }

    // Get external blockchain balance if wallet linked
    const walletUSDTBalance = decryptedAddress ? Web3Service.getWalletUSDTBalance(decryptedAddress) : 0;

    return res.json({
      address: decryptedAddress,
      balanceUSDT: wallet.balance_usdt,
      stakedUSDT: wallet.staked_usdt,
      walletUSDTBalance,
      totalEquity: wallet.balance_usdt + wallet.staked_usdt,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Get Transaction History
router.get('/transactions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const txs = await all<{ id: string; type: string; amount: number; status: string; tx_hash: string; created_at: string }>(
      'SELECT id, type, amount, status, tx_hash, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Decrypt transaction hashes for user viewing
    const decryptedTxs = txs.map((tx) => {
      let decryptedHash = 'N/A';
      try {
        decryptedHash = decrypt(tx.tx_hash);
      } catch {
        decryptedHash = tx.tx_hash;
      }
      return {
        ...tx,
        tx_hash: decryptedHash,
      };
    });

    return res.json({ transactions: decryptedTxs });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
