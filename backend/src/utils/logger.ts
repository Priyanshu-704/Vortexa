import { run } from '../db';
import { v4 as uuidv4 } from 'uuid';

export async function logAudit(userId: string | null, action: string, details: string, ipAddress?: string) {
  try {
    const id = uuidv4();
    await run(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [id, userId, action, details, ipAddress || null]
    );
    console.log(`[AUDIT] User: ${userId || 'SYSTEM'} | Action: ${action} | Details: ${details}`);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
