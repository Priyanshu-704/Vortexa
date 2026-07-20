import sqlite3 from 'sqlite3';
import { DB_PATH } from './config';
import fs from 'fs';
import path from 'path';

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log(`Connected to SQLite database at: ${DB_PATH}`);
  }
});

// Enable WAL mode for high performance concurrency
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA foreign_keys = ON;');
});

// Helper for running queries (INSERT, UPDATE, DELETE)
export function run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: sqlite3.RunResult, err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Helper for fetching a single row
export function get<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

// Helper for fetching all rows
export function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Transaction runner helper for data integrity
export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  await run('BEGIN TRANSACTION;');
  try {
    const result = await callback();
    await run('COMMIT;');
    return result;
  } catch (error) {
    await run('ROLLBACK;');
    throw error;
  }
}

// Initialize tables on startup
export async function initializeDatabase() {
  console.log('Initializing database schema...');

  // Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('USER', 'ADMIN')),
      ref_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      display_name TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIVE', 'SUSPENDED')),
      verification_code TEXT,
      verification_expires TEXT,
      reset_token TEXT,
      reset_expires TEXT,
      timezone TEXT DEFAULT 'UTC',
      notification_prefs TEXT DEFAULT 'ALL',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Wallets Table (Encrypted keys/addresses)
  await run(`
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      balance_usdt REAL DEFAULT 0,
      staked_usdt REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Staking Positions Table
  await run(`
    CREATE TABLE IF NOT EXISTS staking_positions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pool_id TEXT NOT NULL,
      amount REAL NOT NULL,
      apy REAL NOT NULL,
      started_at TEXT NOT NULL,
      matures_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('STAKING', 'WITHDRAWN')),
      accrued_rewards REAL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Transactions Table
  await run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('DEPOSIT', 'WITHDRAWAL', 'STAKE', 'UNSTAKE', 'ARBITRAGE_PROFIT', 'REFERRAL_BONUS')),
      amount REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
      tx_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Referrals Table (redundant helper link table, mainly users referred_by is master)
  await run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referred_id TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // AI State Table
  await run(`
    CREATE TABLE IF NOT EXISTS ai_state (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('RUNNING', 'PAUSED')),
      umbrella_rule_active INTEGER DEFAULT 0,
      current_volatility REAL DEFAULT 0.05,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // AI Trades Table
  await run(`
    CREATE TABLE IF NOT EXISTS ai_trades (
      id TEXT PRIMARY KEY,
      dex_pair TEXT NOT NULL,
      buy_dex TEXT NOT NULL,
      sell_dex TEXT NOT NULL,
      profit_percentage REAL NOT NULL,
      profit_amount REAL NOT NULL,
      amount_used REAL NOT NULL,
      tx_hash TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Audit Logs Table
  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Insert default AI state if empty using INSERT OR IGNORE to prevent unique key race conditions
  await run('INSERT OR IGNORE INTO ai_state (id, status, umbrella_rule_active, current_volatility) VALUES (?, ?, ?, ?)', ['global', 'RUNNING', 0, 0.02]);

  // Simple migrations for existing databases to support Phase 1 Updates
  const migrations = [
    'ALTER TABLE users ADD COLUMN email TEXT;',
    'ALTER TABLE users ADD COLUMN display_name TEXT;',
    'ALTER TABLE users ADD COLUMN avatar TEXT;',
    'ALTER TABLE users ADD COLUMN status TEXT DEFAULT "PENDING";',
    'ALTER TABLE users ADD COLUMN verification_code TEXT;',
    'ALTER TABLE users ADD COLUMN verification_expires TEXT;',
    'ALTER TABLE users ADD COLUMN reset_token TEXT;',
    'ALTER TABLE users ADD COLUMN reset_expires TEXT;',
    'ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT "UTC";',
    'ALTER TABLE users ADD COLUMN notification_prefs TEXT DEFAULT "ALL";'
  ];

  for (const sql of migrations) {
    try {
      await run(sql);
    } catch (e) {
      // Column might already exist, ignore error safely
    }
  }

  console.log('Database schema initialization completed.');

}

export default db;
