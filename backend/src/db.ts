import mongoose from 'mongoose';
import { MONGO_URI } from './config';

// 1. User Model
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ADMIN'], required: true },
  ref_code: { type: String, unique: true, required: true },
  referred_by: { type: String, default: null },
  display_name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING' },
  verification_code: { type: String, default: null },
  verification_expires: { type: String, default: null },
  reset_token: { type: String, default: null },
  reset_expires: { type: String, default: null },
  timezone: { type: String, default: 'UTC' },
  notification_prefs: { type: String, default: 'ALL' },
  created_at: { type: Date, default: Date.now }
});
export const User = mongoose.model('User', UserSchema);

// 2. Wallet Model
const WalletSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, unique: true, required: true },
  address: { type: String, required: true },
  balance_usdt: { type: Number, default: 0 },
  staked_usdt: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});
export const Wallet = mongoose.model('Wallet', WalletSchema);

// 3. StakingPosition Model
const StakingPositionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  pool_id: { type: String, required: true },
  amount: { type: Number, required: true },
  apy: { type: Number, required: true },
  started_at: { type: String, required: true },
  matures_at: { type: String, required: true },
  status: { type: String, enum: ['STAKING', 'WITHDRAWN'], required: true },
  accrued_rewards: { type: Number, default: 0 }
});
export const StakingPosition = mongoose.model('StakingPosition', StakingPositionSchema);

// 4. Transaction Model
const TransactionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, required: true },
  type: { type: String, enum: ['DEPOSIT', 'WITHDRAWAL', 'STAKE', 'UNSTAKE', 'ARBITRAGE_PROFIT', 'REFERRAL_BONUS'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], required: true },
  tx_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
export const Transaction = mongoose.model('Transaction', TransactionSchema);

// 5. Referral Model
const ReferralSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  referrer_id: { type: String, required: true },
  referred_id: { type: String, unique: true, required: true },
  created_at: { type: Date, default: Date.now }
});
export const Referral = mongoose.model('Referral', ReferralSchema);

// 6. AiState Model
const AiStateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: { type: String, enum: ['RUNNING', 'PAUSED'], required: true },
  umbrella_rule_active: { type: Number, default: 0 },
  current_volatility: { type: Number, default: 0.05 },
  updated_at: { type: Date, default: Date.now }
});
export const AiState = mongoose.model('AiState', AiStateSchema);

// 7. AiTrade Model
const AiTradeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  dex_pair: { type: String, required: true },
  buy_dex: { type: String, required: true },
  sell_dex: { type: String, required: true },
  profit_percentage: { type: Number, required: true },
  profit_amount: { type: Number, required: true },
  amount_used: { type: Number, required: true },
  tx_hash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
export const AiTrade = mongoose.model('AiTrade', AiTradeSchema);

// 8. AuditLog Model
const AuditLogSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, default: null },
  action: { type: String, required: true },
  details: { type: String },
  ip_address: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// MongoDB connection initializer
export async function initializeDatabase() {
  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to MongoDB at: ${MONGO_URI}`);

    // Insert default AI state if empty
    const exists = await AiState.findById('global');
    if (!exists) {
      await AiState.create({
        _id: 'global',
        status: 'RUNNING',
        umbrella_rule_active: 0,
        current_volatility: 0.02,
        updated_at: new Date()
      });
      console.log('Inserted default AI state in MongoDB.');
    }
  } catch (err: any) {
    console.error('Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

// SQL mapping utility
function mapDoc(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  // Convert Dates to ISO strings
  for (const key of Object.keys(obj)) {
    if (obj[key] instanceof Date) {
      obj[key] = obj[key].toISOString();
    }
  }
  return obj;
}

// Helper for running write queries (INSERT, UPDATE, DELETE)
export async function run(sql: string, params: any[] = []): Promise<{ id: string | number; changes: number }> {
  const norm = sql.replace(/\s+/g, ' ').trim();

  // Seeding/Registration INSERT matchers
  if (norm.includes('INSERT INTO users') && norm.includes('VORTEXADMIN')) {
    await User.create({
      _id: params[0],
      username: params[1],
      email: params[2],
      password_hash: params[3],
      role: 'ADMIN',
      ref_code: 'VORTEXADMIN',
      status: 'ACTIVE',
      timezone: 'UTC',
      notification_prefs: 'ALL'
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('INSERT INTO users') && norm.includes('INVESTOR1')) {
    await User.create({
      _id: params[0],
      username: params[1],
      email: params[2],
      password_hash: params[3],
      role: 'USER',
      ref_code: 'INVESTOR1',
      referred_by: params[4],
      status: 'ACTIVE',
      timezone: 'UTC',
      notification_prefs: 'ALL'
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('INSERT INTO users') && norm.includes('PENDING')) {
    await User.create({
      _id: params[0],
      username: params[1],
      email: params[2],
      password_hash: params[3],
      role: params[4],
      ref_code: params[5],
      referred_by: params[6],
      status: 'PENDING',
      verification_code: params[7],
      verification_expires: params[8]
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('INSERT INTO staking_positions') && norm.includes('fixed30')) {
    await StakingPosition.create({
      _id: params[0],
      user_id: params[1],
      pool_id: 'fixed30',
      amount: 5000,
      apy: 0.12,
      started_at: params[2],
      matures_at: params[3],
      status: 'STAKING',
      accrued_rewards: 12.50
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('INSERT INTO transactions') && norm.includes('DEPOSIT') && norm.includes('15000')) {
    await Transaction.create({
      _id: params[0],
      user_id: params[1],
      type: 'DEPOSIT',
      amount: 15000,
      status: 'COMPLETED',
      tx_hash: params[2],
      created_at: new Date(params[3])
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('INSERT INTO transactions') && norm.includes('STAKE') && norm.includes('5000')) {
    await Transaction.create({
      _id: params[0],
      user_id: params[1],
      type: 'STAKE',
      amount: 5000,
      status: 'COMPLETED',
      tx_hash: params[2],
      created_at: new Date(params[3])
    });
    return { id: params[0], changes: 1 };
  }

  // Generic INSERT matchers
  if (norm.startsWith('INSERT INTO referrals')) {
    await Referral.create({
      _id: params[0],
      referrer_id: params[1],
      referred_id: params[2]
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.startsWith('INSERT INTO wallets')) {
    await Wallet.create({
      _id: params[0],
      user_id: params[1],
      address: params[2],
      balance_usdt: params[3],
      staked_usdt: params[4]
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.startsWith('INSERT INTO staking_positions')) {
    await StakingPosition.create({
      _id: params[0],
      user_id: params[1],
      pool_id: params[2],
      amount: params[3],
      apy: params[4],
      started_at: params[5],
      matures_at: params[6],
      status: params[7]
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.startsWith('INSERT INTO transactions')) {
    await Transaction.create({
      _id: params[0],
      user_id: params[1],
      type: params[2],
      amount: params[3],
      status: params[4],
      tx_hash: params[5]
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.startsWith('INSERT INTO ai_trades')) {
    await AiTrade.create({
      _id: params[0],
      dex_pair: params[1],
      buy_dex: params[2],
      sell_dex: params[3],
      profit_percentage: params[4],
      profit_amount: params[5],
      amount_used: params[6],
      tx_hash: params[7]
    });
    return { id: params[0], changes: 1 };
  }

  if (norm.startsWith('INSERT INTO audit_logs')) {
    await AuditLog.create({
      _id: params[0],
      user_id: params[1],
      action: params[2],
      details: params[3],
      ip_address: params[4]
    });
    return { id: params[0], changes: 1 };
  }

  // UPDATE matchers
  if (norm.includes('UPDATE users SET status = "ACTIVE"')) {
    await User.findByIdAndUpdate(params[0], { status: 'ACTIVE', verification_code: null, verification_expires: null });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('UPDATE users SET verification_code = ?')) {
    await User.findByIdAndUpdate(params[2], { verification_code: params[0], verification_expires: params[1] });
    return { id: params[2], changes: 1 };
  }

  if (norm.includes('UPDATE users SET reset_token = ?')) {
    await User.findByIdAndUpdate(params[2], { reset_token: params[0], reset_expires: params[1] });
    return { id: params[2], changes: 1 };
  }

  if (norm.includes('UPDATE users SET password_hash = ?') && norm.includes('reset_token = NULL')) {
    await User.findByIdAndUpdate(params[1], { password_hash: params[0], reset_token: null, reset_expires: null });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE users SET display_name = ?')) {
    await User.findByIdAndUpdate(params[4], { display_name: params[0], avatar: params[1], timezone: params[2], notification_prefs: params[3] });
    return { id: params[4], changes: 1 };
  }

  if (norm.includes('UPDATE users SET password_hash = ? WHERE id = ?')) {
    await User.findByIdAndUpdate(params[1], { password_hash: params[0] });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE wallets SET address = ?')) {
    await Wallet.findOneAndUpdate({ user_id: params[1] }, { address: params[0] });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?')) {
    await Wallet.findOneAndUpdate({ user_id: params[1] }, { $inc: { balance_usdt: params[0] } });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE wallets SET balance_usdt = balance_usdt - ? WHERE user_id = ?')) {
    await Wallet.findOneAndUpdate({ user_id: params[1] }, { $inc: { balance_usdt: -params[0] } });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE wallets SET balance_usdt = balance_usdt - ?, staked_usdt = staked_usdt + ?')) {
    await Wallet.findOneAndUpdate({ user_id: params[2] }, { $inc: { balance_usdt: -params[0], staked_usdt: params[1] } });
    return { id: params[2], changes: 1 };
  }

  if (norm.includes('UPDATE wallets SET balance_usdt = balance_usdt + ?, staked_usdt = staked_usdt - ?')) {
    await Wallet.findOneAndUpdate({ user_id: params[2] }, { $inc: { balance_usdt: params[0], staked_usdt: -params[1] } });
    return { id: params[2], changes: 1 };
  }

  if (norm.includes('UPDATE staking_positions SET started_at = ?, accrued_rewards = accrued_rewards + ?')) {
    await StakingPosition.findByIdAndUpdate(params[2], { started_at: params[0], $inc: { accrued_rewards: params[1] } });
    return { id: params[2], changes: 1 };
  }

  if (norm.includes('UPDATE staking_positions SET status = "WITHDRAWN"')) {
    await StakingPosition.findByIdAndUpdate(params[1], { status: 'WITHDRAWN', $inc: { accrued_rewards: params[0] } });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE transactions SET status = "COMPLETED"')) {
    await Transaction.findByIdAndUpdate(params[1], { status: 'COMPLETED', tx_hash: params[0] });
    return { id: params[1], changes: 1 };
  }

  if (norm.includes('UPDATE transactions SET status = "REJECTED"')) {
    await Transaction.findByIdAndUpdate(params[0], { status: 'REJECTED' });
    return { id: params[0], changes: 1 };
  }

  if (norm.includes('UPDATE ai_state SET status = "PAUSED", umbrella_rule_active = 1')) {
    await AiState.findByIdAndUpdate('global', { status: 'PAUSED', umbrella_rule_active: 1, updated_at: new Date() });
    return { id: 'global', changes: 1 };
  }

  if (norm.includes('UPDATE ai_state SET status = "RUNNING", umbrella_rule_active = 0')) {
    await AiState.findByIdAndUpdate('global', { status: 'RUNNING', umbrella_rule_active: 0, current_volatility: 0.02, updated_at: new Date() });
    return { id: 'global', changes: 1 };
  }

  if (norm.includes('UPDATE ai_state SET current_volatility = ?')) {
    await AiState.findByIdAndUpdate('global', { current_volatility: params[0], updated_at: new Date() });
    return { id: 'global', changes: 1 };
  }

  if (norm.includes('UPDATE ai_state SET status = ?')) {
    await AiState.findByIdAndUpdate('global', { status: params[0], updated_at: new Date() });
    return { id: 'global', changes: 1 };
  }

  if (norm.includes('INSERT OR IGNORE INTO ai_state')) {
    const exists = await AiState.findById(params[0]);
    if (!exists) {
      await AiState.create({
        _id: params[0],
        status: params[1],
        umbrella_rule_active: params[2],
        current_volatility: params[3],
        updated_at: new Date()
      });
    }
    return { id: params[0], changes: 1 };
  }

  // DELETE handlers (used in tests)
  if (norm.includes('DELETE FROM users')) {
    const result = await User.deleteMany({
      $or: [
        { username: { $regex: params[0]?.replace(/%/g, '.*') || '' } },
        { username: { $regex: params[1]?.replace(/%/g, '.*') || '' } }
      ]
    });
    return { id: 0, changes: result.deletedCount || 0 };
  }

  // Safe migrations fall-through (noop for MongoDB)
  if (norm.includes('ALTER TABLE') || norm.includes('CREATE TABLE')) {
    return { id: 0, changes: 0 };
  }

  console.warn('[SQL COMPAT] Unmatched write query:', norm, params);
  return { id: 0, changes: 0 };
}

// Helper for fetching a single row
export async function get<T>(sql: string, params: any[] = []): Promise<T | null> {
  const norm = sql.replace(/\s+/g, ' ').trim();

  if (norm === 'SELECT id FROM users WHERE username = ?') {
    const user = await User.findOne({ username: params[0] });
    return user ? ({ id: user._id } as any) : null;
  }

  if (norm === 'SELECT id FROM users WHERE email = ?') {
    const user = await User.findOne({ email: params[0] });
    return user ? ({ id: user._id } as any) : null;
  }

  if (norm === 'SELECT id FROM users WHERE ref_code = ?') {
    const user = await User.findOne({ ref_code: params[0] });
    return user ? ({ id: user._id } as any) : null;
  }

  if (norm === 'SELECT id, status, verification_code FROM users WHERE username = ?') {
    const user = await User.findOne({ username: params[0] });
    return user ? ({ id: user._id, status: user.status, verification_code: user.verification_code } as any) : null;
  }

  if (norm === 'SELECT verification_code FROM users WHERE email = ?') {
    const user = await User.findOne({ email: params[0] });
    return user ? ({ verification_code: user.verification_code } as any) : null;
  }

  if (norm === 'SELECT status FROM users WHERE email = ?') {
    const user = await User.findOne({ email: params[0] });
    return user ? ({ status: user.status } as any) : null;
  }

  if (norm === 'SELECT COUNT(*) as count FROM users WHERE role = "USER"') {
    const count = await User.countDocuments({ role: 'USER' });
    return { count } as any;
  }

  if (norm === 'SELECT COUNT(*) as count FROM users') {
    const count = await User.countDocuments({});
    return { count } as any;
  }

  if (norm === 'SELECT referred_by FROM users WHERE id = ?') {
    const user = await User.findById(params[0]);
    return user ? ({ referred_by: user.referred_by } as any) : null;
  }

  if (norm === 'SELECT id, username, role, ref_code, status, verification_code, verification_expires FROM users WHERE email = ?') {
    const user = await User.findOne({ email: params[0] });
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT id, username, email, password_hash, role, ref_code, status FROM users WHERE username = ? OR email = ?') {
    const user = await User.findOne({
      $or: [
        { username: params[0] },
        { email: params[1] }
      ]
    });
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT id, reset_token, reset_expires FROM users WHERE email = ?') {
    const user = await User.findOne({ email: params[0] });
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT id, username, email, role, ref_code, display_name, avatar, status, timezone, notification_prefs, created_at FROM users WHERE id = ?') {
    const user = await User.findById(params[0]);
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT display_name, avatar, timezone, notification_prefs FROM users WHERE id = ?') {
    const user = await User.findById(params[0]);
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT password_hash FROM users WHERE id = ?') {
    const user = await User.findById(params[0]);
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT id, username, role, ref_code, referred_by FROM users WHERE id = ?') {
    const user = await User.findById(params[0]);
    return user ? (mapDoc(user) as any) : null;
  }

  if (norm === 'SELECT address FROM wallets WHERE user_id = ?') {
    const wallet = await Wallet.findOne({ user_id: params[0] });
    return wallet ? (mapDoc(wallet) as any) : null;
  }

  if (norm === 'SELECT address, balance_usdt FROM wallets WHERE user_id = ?') {
    const wallet = await Wallet.findOne({ user_id: params[0] });
    return wallet ? (mapDoc(wallet) as any) : null;
  }

  if (norm === 'SELECT balance_usdt FROM wallets WHERE user_id = ?') {
    const wallet = await Wallet.findOne({ user_id: params[0] });
    return wallet ? (mapDoc(wallet) as any) : null;
  }

  if (norm === 'SELECT address, balance_usdt, staked_usdt FROM wallets WHERE user_id = ?') {
    const wallet = await Wallet.findOne({ user_id: params[0] });
    return wallet ? (mapDoc(wallet) as any) : null;
  }

  if (norm === 'SELECT * FROM staking_positions WHERE id = ? AND user_id = ? AND status = "STAKING"') {
    const pos = await StakingPosition.findOne({ _id: params[0], user_id: params[1], status: 'STAKING' });
    return pos ? (mapDoc(pos) as any) : null;
  }

  if (norm === 'SELECT user_id, amount, status FROM transactions WHERE id = ?') {
    const tx = await Transaction.findById(params[0]);
    return tx ? (mapDoc(tx) as any) : null;
  }

  if (norm === 'SELECT status FROM ai_state WHERE id = "global"') {
    const state = await AiState.findById('global');
    return state ? (mapDoc(state) as any) : null;
  }

  if (norm === 'SELECT status, umbrella_rule_active, current_volatility, updated_at FROM ai_state WHERE id = "global"') {
    const state = await AiState.findById('global');
    return state ? (mapDoc(state) as any) : null;
  }

  if (norm === 'SELECT status, umbrella_rule_active, current_volatility FROM ai_state WHERE id = "global"') {
    const state = await AiState.findById('global');
    return state ? (mapDoc(state) as any) : null;
  }

  if (norm === 'SELECT COUNT(*) as count FROM ai_trades') {
    const count = await AiTrade.countDocuments({});
    return { count } as any;
  }

  if (norm === 'SELECT SUM(profit_amount) as total FROM ai_trades') {
    const res = await AiTrade.aggregate([{ $group: { _id: null, total: { $sum: '$profit_amount' } } }]);
    return { total: res[0]?.total || 0 } as any;
  }

  if (norm === 'SELECT SUM(amount) as total FROM transactions WHERE type = "DEPOSIT" AND status = "COMPLETED"') {
    const res = await Transaction.aggregate([{ $match: { type: 'DEPOSIT', status: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return { total: res[0]?.total || 0 } as any;
  }

  if (norm === 'SELECT SUM(amount) as total FROM transactions WHERE type = "WITHDRAWAL" AND status = "COMPLETED"') {
    const res = await Transaction.aggregate([{ $match: { type: 'WITHDRAWAL', status: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return { total: res[0]?.total || 0 } as any;
  }

  if (norm === 'SELECT SUM(balance_usdt) as total FROM wallets') {
    const res = await Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance_usdt' } } }]);
    return { total: res[0]?.total || 0 } as any;
  }

  if (norm === 'SELECT SUM(staked_usdt) as total FROM wallets') {
    const res = await Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$staked_usdt' } } }]);
    return { total: res[0]?.total || 0 } as any;
  }

  if (norm === 'SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = "REFERRAL_BONUS" AND status = "COMPLETED"') {
    const res = await Transaction.aggregate([{ $match: { user_id: params[0], type: 'REFERRAL_BONUS', status: 'COMPLETED' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return { total: res[0]?.total || 0 } as any;
  }

  console.warn('[SQL COMPAT] Unmatched get query:', norm, params);
  return null;
}

// Helper for fetching all rows
export async function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  const norm = sql.replace(/\s+/g, ' ').trim();

  if (norm === 'SELECT id, username, created_at FROM users WHERE referred_by = ?') {
    const users = await User.find({ referred_by: params[0] });
    return users.map(mapDoc) as any;
  }

  if (norm === 'SELECT id, type, amount, status, tx_hash, created_at FROM transactions WHERE user_id = ? ORDER BY created_at DESC') {
    const txs = await Transaction.find({ user_id: params[0] }).sort({ created_at: -1 });
    return txs.map(mapDoc) as any;
  }

  if (norm === 'SELECT * FROM staking_positions WHERE user_id = ? AND status = "STAKING"') {
    const positions = await StakingPosition.find({ user_id: params[0], status: 'STAKING' });
    return positions.map(mapDoc) as any;
  }

  if (norm === 'SELECT DISTINCT user_id FROM staking_positions WHERE status = "STAKING"') {
    const userIds = await StakingPosition.distinct('user_id', { status: 'STAKING' });
    return userIds.map(uid => ({ user_id: uid })) as any;
  }

  if (norm === 'SELECT id FROM users') {
    const users = await User.find({}).select('_id');
    return users.map(u => ({ id: u._id })) as any;
  }

  if (norm === 'SELECT * FROM ai_trades ORDER BY timestamp DESC LIMIT 5') {
    const trades = await AiTrade.find({}).sort({ timestamp: -1 }).limit(5);
    return trades.map(mapDoc) as any;
  }

  if (norm === 'SELECT * FROM ai_trades ORDER BY timestamp DESC LIMIT 50') {
    const trades = await AiTrade.find({}).sort({ timestamp: -1 }).limit(50);
    return trades.map(mapDoc) as any;
  }

  if (norm === 'SELECT u.id, u.username, u.role, u.ref_code, w.address, w.balance_usdt, w.staked_usdt FROM users u LEFT JOIN wallets w ON u.id = w.user_id') {
    const users = await User.find({});
    const wallets = await Wallet.find({});
    const walletMap = new Map(wallets.map(w => [w.user_id, w]));
    return users.map(u => {
      const w = walletMap.get(u._id);
      return {
        id: u._id,
        username: u.username,
        role: u.role,
        ref_code: u.ref_code,
        address: w ? w.address : '',
        balance_usdt: w ? w.balance_usdt : 0,
        staked_usdt: w ? w.staked_usdt : 0
      };
    }) as any;
  }

  if (norm === 'SELECT t.id, u.username, t.amount, t.status, t.tx_hash, t.created_at FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.type = "WITHDRAWAL" AND t.status = "PENDING" ORDER BY t.created_at DESC') {
    const txs = await Transaction.find({ type: 'WITHDRAWAL', status: 'PENDING' }).sort({ created_at: -1 });
    const userIds = txs.map(t => t.user_id);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map(u => [u._id, u.username]));
    return txs.map(t => ({
      id: t._id,
      username: userMap.get(t.user_id) || 'Unknown',
      amount: t.amount,
      status: t.status,
      tx_hash: t.tx_hash,
      created_at: t.created_at.toISOString()
    })) as any;
  }

  if (norm === 'SELECT a.id, u.username, a.action, a.details, a.ip_address, a.created_at FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 100') {
    const logs = await AuditLog.find({}).sort({ created_at: -1 }).limit(100);
    const userIds = logs.map(l => l.user_id).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map(u => [u._id, u.username]));
    return logs.map(l => ({
      id: l._id,
      username: l.user_id ? (userMap.get(l.user_id) || null) : null,
      action: l.action,
      details: l.details,
      ip_address: l.ip_address,
      created_at: l.created_at.toISOString()
    })) as any;
  }

  console.warn('[SQL COMPAT] Unmatched all query:', norm, params);
  return [];
}

// Transaction runner helper
export async function transaction<T>(callback: () => Promise<T>): Promise<T> {
  return await callback();
}

const db = { run, get, all, transaction, initializeDatabase };
export default db;
