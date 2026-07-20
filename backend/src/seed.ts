import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { run, get, initializeDatabase } from './db';
import { encrypt } from './utils/crypto';

export async function runSeed() {
  console.log('Seeding default platform data...');

  try {
    // 1. Seed default ADMIN user
    const adminEmail = 'admin@vortexa.com';
    const adminUsername = 'admin';
    const existingAdmin = await get('SELECT id FROM users WHERE email = ?', [adminEmail]);

    let adminId = uuidv4();
    if (!existingAdmin) {
      const adminPassHash = await bcrypt.hash('Password123!', 12);
      await run(
        `INSERT INTO users (id, username, email, password_hash, role, ref_code, status, timezone, notification_prefs)
         VALUES (?, ?, ?, ?, 'ADMIN', 'VORTEXADMIN', 'ACTIVE', 'UTC', 'ALL')`,
        [adminId, adminUsername, adminEmail, adminPassHash]
      );
      console.log(`Default ADMIN created: ${adminEmail} / Password123!`);

      // Initialize admin wallet
      const adminWalletAddress = encrypt(`0x${crypto.randomBytes(20).toString('hex')}`);
      await run(
        'INSERT INTO wallets (id, user_id, address, balance_usdt, staked_usdt) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), adminId, adminWalletAddress, 50000, 0]
      );
    } else {
      adminId = (existingAdmin as any).id;
    }

    // 2. Seed default investor USER
    const investorEmail = 'investor@vortexa.com';
    const investorUsername = 'investor';
    const existingInvestor = await get('SELECT id FROM users WHERE email = ?', [investorEmail]);

    let investorId = uuidv4();
    if (!existingInvestor) {
      const investorPassHash = await bcrypt.hash('Password123!', 12);
      await run(
        `INSERT INTO users (id, username, email, password_hash, role, ref_code, referred_by, status, timezone, notification_prefs)
         VALUES (?, ?, ?, ?, 'USER', 'INVESTOR1', ?, 'ACTIVE', 'UTC', 'ALL')`,
        [investorId, investorUsername, investorEmail, investorPassHash, adminId]
      );
      console.log(`Default USER created: ${investorEmail} / Password123!`);

      // Link referrals helper
      await run('INSERT INTO referrals (id, referrer_id, referred_id) VALUES (?, ?, ?)', [
        uuidv4(),
        adminId,
        investorId
      ]);

      // Initialize investor wallet with 10,000 USDT preloaded balance
      const investorWalletAddress = encrypt(`0x${crypto.randomBytes(20).toString('hex')}`);
      await run(
        'INSERT INTO wallets (id, user_id, address, balance_usdt, staked_usdt) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), investorId, investorWalletAddress, 10000, 5000]
      );

      // Create an active 30-Day staking position for the investor
      const posId = uuidv4();
      const now = new Date();
      const matures = new Date();
      matures.setDate(matures.getDate() + 30);
      await run(
        `INSERT INTO staking_positions (id, user_id, pool_id, amount, apy, started_at, matures_at, status, accrued_rewards)
         VALUES (?, ?, 'fixed30', 5000, 0.12, ?, ?, 'STAKING', 12.50)`,
        [posId, investorId, now.toISOString(), matures.toISOString()]
      );

      // Create mock transaction logs
      await run(
        `INSERT INTO transactions (id, user_id, type, amount, status, tx_hash, created_at)
         VALUES (?, ?, 'DEPOSIT', 15000, 'COMPLETED', ?, ?)`,
        [uuidv4(), investorId, `0x${crypto.randomBytes(32).toString('hex')}`, now.toISOString()]
      );

      await run(
        `INSERT INTO transactions (id, user_id, type, amount, status, tx_hash, created_at)
         VALUES (?, ?, 'STAKE', 5000, 'COMPLETED', ?, ?)`,
        [uuidv4(), investorId, `0x${crypto.randomBytes(32).toString('hex')}`, now.toISOString()]
      );
    }

    // 3. Seed Mock AI Trades history for Arbitrage Monitor UI
    const tradesCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM ai_trades');
    if (tradesCount && tradesCount.count === 0) {
      const mockTrades = [
        { dex_pair: 'ETH/USDT', buy_dex: 'SUSHISWAP', sell_dex: 'UNISWAP', profit_percentage: 0.0125, profit_amount: 125.00, amount_used: 10000 },
        { dex_pair: 'BTC/USDT', buy_dex: 'UNISWAP', sell_dex: 'CURVE', profit_percentage: 0.0084, profit_amount: 84.00, amount_used: 10000 },
        { dex_pair: 'ETH/USDT', buy_dex: 'CURVE', sell_dex: 'SUSHISWAP', profit_percentage: 0.0156, profit_amount: 156.00, amount_used: 10000 },
        { dex_pair: 'SOL/USDT', buy_dex: 'UNISWAP', sell_dex: 'SUSHISWAP', profit_percentage: 0.0210, profit_amount: 210.00, amount_used: 10000 },
      ];

      for (const t of mockTrades) {
        await run(
          `INSERT INTO ai_trades (id, dex_pair, buy_dex, sell_dex, profit_percentage, profit_amount, amount_used, tx_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuidv4(), t.dex_pair, t.buy_dex, t.sell_dex, t.profit_percentage, t.profit_amount, t.amount_used, `0x${crypto.randomBytes(32).toString('hex')}`]
        );
      }
      console.log('Seeded mock AI Arbitrage executions.');
    }

    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Database seeding failed:', error);
  }
}

// Allow execution direct from node environment
if (require.main === module) {
  (async () => {
    await initializeDatabase();
    await runSeed();
  })();
}
