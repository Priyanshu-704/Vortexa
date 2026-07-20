import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import ReferralService from '../services/referral';

const router = Router();

// 1. Get referral stats for dashboard
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const stats = await ReferralService.getReferralStats(req.user.id);
    return res.json(stats);
  } catch (error: any) {
    console.error('Error fetching referral stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
