import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { get, run, initializeDatabase } from '../db';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Explicitly await database schema initialization to avoid race conditions
    await initializeDatabase();
    // Clear test users
    await run('DELETE FROM users WHERE username LIKE ? OR username LIKE ?', ['testuser_%', 'u_%']);
  });

  const uniqueUser = `u_${Date.now().toString().substring(5)}`;
  const uniqueEmail = `${uniqueUser}@vortexa.com`;
  let accessToken = '';

  it('should register a new user in PENDING status and log OTP', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: uniqueUser,
        email: uniqueEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('email', uniqueEmail);

    // Verify database entry is PENDING and has verification details
    const dbUser = await get<{ id: string; status: string; verification_code: string }>(
      'SELECT id, status, verification_code FROM users WHERE username = ?',
      [uniqueUser]
    );
    expect(dbUser).not.toBeNull();
    expect(dbUser!.status).toBe('PENDING');
    expect(dbUser!.verification_code).not.toBeNull();
  });

  it('should fail login while user status is PENDING', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: uniqueEmail, // support login via email
        password: 'Password123!',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.status).toBe('PENDING');
  });

  it('should verify email with OTP code and activate account', async () => {
    // 1. Get OTP code from database
    const dbUser = await get<{ verification_code: string }>('SELECT verification_code FROM users WHERE email = ?', [uniqueEmail]);
    expect(dbUser).not.toBeNull();
    const otpCode = dbUser!.verification_code;

    // 2. Call verify-email endpoint
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({
        email: uniqueEmail,
        code: otpCode
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toHaveProperty('username', uniqueUser);

    accessToken = res.body.accessToken;

    // 3. Confirm database status updated to ACTIVE
    const dbUserAfter = await get<{ status: string }>('SELECT status FROM users WHERE email = ?', [uniqueEmail]);
    expect(dbUserAfter!.status).toBe('ACTIVE');
  });

  it('should login successfully once account is ACTIVE', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: uniqueEmail, // can log in with email
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toHaveProperty('username', uniqueUser);
  });

  it('should retrieve profile details via /profile', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toHaveProperty('username', uniqueUser);
    expect(res.body.profile).toHaveProperty('email', uniqueEmail);
    expect(res.body.profile).toHaveProperty('status', 'ACTIVE');
    expect(res.body.profile).toHaveProperty('walletAddress');
  });

  it('should update profile display name and preferences', async () => {
    const res = await request(app)
      .post('/api/auth/profile/update')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Vortexa Investor Prime',
        timezone: 'GMT+2',
        notificationPrefs: 'EMAIL_ONLY'
      });

    expect(res.status).toBe(200);
    expect(res.body.profile).toHaveProperty('displayName', 'Vortexa Investor Prime');
    expect(res.body.profile).toHaveProperty('timezone', 'GMT+2');
    expect(res.body.profile).toHaveProperty('notificationPrefs', 'EMAIL_ONLY');
  });

  it('should update password after verifying old password', async () => {
    const res = await request(app)
      .post('/api/auth/profile/update-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        oldPassword: 'Password123!',
        newPassword: 'Password456!'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Confirm new password works for login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: uniqueEmail,
        password: 'Password456!',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');
  });
});
