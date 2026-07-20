import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { run, get } from '../db';
import { JWT_SECRET, JWT_REFRESH_SECRET, NODE_ENV } from '../config';
import { logAudit } from '../utils/logger';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/crypto';

const router = Router();

// Password validation regex (Min 8 chars, 1 uppercase, 1 lowercase, 1 number)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// Simple email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to generate random 6-digit code (OTP)
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to generate a random unique referral code
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate JWT tokens
function generateAccessToken(user: { id: string; username: string; role: 'USER' | 'ADMIN' }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user: { id: string; username: string; role: 'USER' | 'ADMIN' }): string {
  return jwt.sign(user, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

// 1. Updated Registration Route (with Email and OTP verification)
router.post('/register', async (req: any, res: Response) => {
  const { username, email, password, referredBy } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    });
  }

  try {
    // Check duplicate username
    const existingUserByUsername = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUserByUsername) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // Check duplicate email
    const existingUserByEmail = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    let referredByUserId: string | null = null;
    if (referredBy) {
      const referrer = await get<{ id: string }>('SELECT id FROM users WHERE ref_code = ?', [referredBy.toUpperCase()]);
      if (!referrer) {
        return res.status(400).json({ error: 'Invalid referral code' });
      }
      referredByUserId = referrer.id;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const refCode = generateReferralCode();

    // Check user count to auto-promote first user to ADMIN
    const userCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const role: 'USER' | 'ADMIN' = (userCount && userCount.count === 0) ? 'ADMIN' : 'USER';

    // OTP Generation
    const verificationCode = generateOTP();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 15); // Expiry in 15 mins
    const verificationExpires = expiryTime.toISOString();

    // Insert user as PENDING status
    await run(
      `INSERT INTO users (id, username, email, password_hash, role, ref_code, referred_by, status, verification_code, verification_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [userId, username, email.toLowerCase(), passwordHash, role, refCode, referredByUserId, verificationCode, verificationExpires]
    );

    // Link referrals
    if (referredByUserId) {
      await run('INSERT INTO referrals (id, referrer_id, referred_id) VALUES (?, ?, ?)', [
        uuidv4(),
        referredByUserId,
        userId,
      ]);
    }

    // Initialize mock encrypted wallet for user
    const mockWalletAddress = encrypt(`0x${crypto.randomBytes(20).toString('hex')}`);
    const walletId = uuidv4();
    await run(
      'INSERT INTO wallets (id, user_id, address, balance_usdt, staked_usdt) VALUES (?, ?, ?, ?, ?)',
      [walletId, userId, mockWalletAddress, 0, 0]
    );

    // MOCK EMAIL OTP DISPATCH (Console Log Logging)
    console.log('--------------------------------------------------');
    console.log(`[SIMULATED EMAIL DISPATCH] TO: ${email}`);
    console.log(`SUBJECT: Vortexa Registration Verification Code`);
    console.log(`BODY: Your registration verification code is: ${verificationCode}`);
    console.log(`This code expires in 15 minutes.`);
    console.log('--------------------------------------------------');

    await logAudit(userId, 'REGISTER_PENDING', `Registered pending verification for email: ${email}`);

    return res.status(201).json({
      message: 'Registration successful. A verification OTP code has been dispatched to your email.',
      email: email.toLowerCase()
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// 2. Email Verification Route (to activate PENDING status accounts)
router.post('/verify-email', async (req: any, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    const user = await get<{ id: string; username: string; role: 'USER' | 'ADMIN'; ref_code: string; status: string; verification_code: string; verification_expires: string }>(
      'SELECT id, username, role, ref_code, status, verification_code, verification_expires FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(404).json({ error: 'User account not found' });
    }

    if (user.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Email is already verified and account is active' });
    }

    // Check expiration
    const expiry = new Date(user.verification_expires).getTime();
    if (Date.now() > expiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please register again or request a new one.' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    // Update status to ACTIVE
    await run(
      'UPDATE users SET status = "ACTIVE", verification_code = NULL, verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    await logAudit(user.id, 'EMAIL_VERIFIED', `Account activated for email: ${email}`);

    // Generate access tokens for instant login upon verification
    const userPayload = { id: user.id, username: user.username, role: user.role };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      message: 'Account verified and activated successfully.',
      accessToken,
      user: { id: user.id, username: user.username, role: user.role, refCode: user.ref_code }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ error: 'Internal server error during email verification' });
  }
});

// 3. Updated Login Route (Supports username or email + checks ACTIVE status)
router.post('/login', async (req: any, res: Response) => {
  const { username, password } = req.body; // username parameter can receive either email or username

  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }

  try {
    // Search user by username or email
    const user = await get<{ id: string; username: string; email: string; password_hash: string; role: 'USER' | 'ADMIN'; ref_code: string; status: string }>(
      'SELECT id, username, email, password_hash, role, ref_code, status FROM users WHERE username = ? OR email = ?',
      [username, username.toLowerCase()]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      await logAudit(null, 'LOGIN_FAILED', `Failed login attempt for handle: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Account status check
    if (user.status === 'PENDING') {
      const verificationCode = generateOTP();
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);
      const verificationExpires = expiryTime.toISOString();

      await run(
        'UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?',
        [verificationCode, verificationExpires, user.id]
      );

      console.log('--------------------------------------------------');
      console.log(`[SIMULATED EMAIL DISPATCH] TO: ${user.email}`);
      console.log(`SUBJECT: Vortexa Registration Verification Code (Login Re-issue)`);
      console.log(`BODY: Your registration verification code is: ${verificationCode}`);
      console.log(`This code expires in 15 minutes.`);
      console.log('--------------------------------------------------');

      return res.status(400).json({ 
        error: 'Account pending email verification. A new verification OTP code has been logged to your console.', 
        status: 'PENDING', 
        email: user.email 
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account suspended. Contact administrator.' });
    }

    await logAudit(user.id, 'LOGIN_SUCCESS', `Successfully logged in`);

    const userPayload = { id: user.id, username: user.username, role: user.role };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      message: 'Login successful',
      accessToken,
      user: { id: user.id, username: user.username, role: user.role, refCode: user.ref_code },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// 4. Forgot Password Route
router.post('/forgot-password', async (req: any, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    const user = await get<{ id: string }>('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);

    // To prevent email enumeration attacks, always return success status even if user is not found
    if (!user) {
      return res.json({ message: 'If a matching account exists, a password reset code has been sent to your email.' });
    }

    const resetToken = generateOTP();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15); // Expiry in 15 mins
    const resetExpires = expiry.toISOString();

    await run(
      'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id]
    );

    // MOCK PASSWORD RESET OTP DISPATCH
    console.log('--------------------------------------------------');
    console.log(`[SIMULATED EMAIL DISPATCH] TO: ${email}`);
    console.log(`SUBJECT: Vortexa Password Reset Verification Code`);
    console.log(`BODY: Your password reset verification code is: ${resetToken}`);
    console.log(`This code expires in 15 minutes.`);
    console.log('--------------------------------------------------');

    await logAudit(user.id, 'FORGOT_PASSWORD_REQUEST', `Password reset token generated for email: ${email}`);

    return res.json({ message: 'If a matching account exists, a password reset code has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Reset Password Route (validation checks)
router.post('/reset-password', async (req: any, res: Response) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required' });
  }

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    });
  }

  try {
    const user = await get<{ id: string; reset_token: string; reset_expires: string }>(
      'SELECT id, reset_token, reset_expires FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (!user || !user.reset_token || user.reset_token !== code) {
      return res.status(400).json({ error: 'Invalid verification code or email' });
    }

    // Expiration check
    const expiry = new Date(user.reset_expires).getTime();
    if (Date.now() > expiry) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await run(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [newHash, user.id]
    );

    await logAudit(user.id, 'PASSWORD_RESET_SUCCESS', `Password reset successfully via token validation`);

    return res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. View Profile Route (returns profile details)
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await get<{ id: string; username: string; email: string; role: string; ref_code: string; display_name: string | null; avatar: string | null; status: string; timezone: string; notification_prefs: string; created_at: string }>(
      'SELECT id, username, email, role, ref_code, display_name, avatar, status, timezone, notification_prefs, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Fetch linked wallet details
    const wallet = await get<{ address: string }>('SELECT address FROM wallets WHERE user_id = ?', [req.user.id]);
    let decryptedAddress = null;
    if (wallet && wallet.address) {
      try {
        decryptedAddress = decrypt(wallet.address);
      } catch {
        decryptedAddress = wallet.address;
      }
    }

    return res.json({
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        refCode: user.ref_code,
        displayName: user.display_name || user.username,
        avatar: user.avatar,
        status: user.status,
        timezone: user.timezone,
        notificationPrefs: user.notification_prefs,
        createdAt: user.created_at,
        walletAddress: decryptedAddress
      }
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Update Profile Route
router.post('/profile/update', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { displayName, avatar, timezone, notificationPrefs } = req.body;

  if (displayName && (displayName.length < 2 || displayName.length > 50)) {
    return res.status(400).json({ error: 'Display name must be between 2 and 50 characters' });
  }

  try {
    // Current profile
    const current = await get<{ display_name: string; avatar: string; timezone: string; notification_prefs: string }> (
      'SELECT display_name, avatar, timezone, notification_prefs FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!current) return res.status(404).json({ error: 'User profile not found' });

    const updatedDisplayName = displayName !== undefined ? displayName : current.display_name;
    const updatedAvatar = avatar !== undefined ? avatar : current.avatar;
    const updatedTimezone = timezone !== undefined ? timezone : current.timezone;
    const updatedNotificationPrefs = notificationPrefs !== undefined ? notificationPrefs : current.notification_prefs;

    await run(
      `UPDATE users 
       SET display_name = ?, avatar = ?, timezone = ?, notification_prefs = ? 
       WHERE id = ?`,
      [updatedDisplayName, updatedAvatar, updatedTimezone, updatedNotificationPrefs, req.user.id]
    );

    await logAudit(req.user.id, 'PROFILE_UPDATED', `Updated profile parameters: displayName=${updatedDisplayName}, timezone=${updatedTimezone}`);

    return res.json({
      message: 'Profile updated successfully',
      profile: {
        displayName: updatedDisplayName,
        avatar: updatedAvatar,
        timezone: updatedTimezone,
        notificationPrefs: updatedNotificationPrefs
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Update Password Route (validating old password first)
router.post('/profile/update-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    });
  }

  try {
    const user = await get<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate old password
    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    await logAudit(req.user.id, 'PASSWORD_UPDATED', `Password updated successfully via verification of old password`);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token, logout and details endpoints remain mapped
router.post('/refresh', async (req: any, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      const userPayload = { id: decoded.id, username: decoded.username, role: decoded.role };
      const accessToken = generateAccessToken(userPayload);

      return res.json({ accessToken });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error during token refresh' });
  }
});

router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    await logAudit(req.user.id, 'LOGOUT', 'User logged out');
  }
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await get<{ id: string; username: string; role: 'USER' | 'ADMIN'; ref_code: string; referred_by: string | null }>(
      'SELECT id, username, role, ref_code, referred_by FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
