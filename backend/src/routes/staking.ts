import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { StakingService, STAKING_POOLS } from '../services/staking';

const router = Router();

// 1. Get all available pools
router.get('/pools', (req, res) => {
  res.json({ pools: Object.values(STAKING_POOLS) });
});

// 2. Get active user positions
router.get('/positions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const positions = await StakingService.getUserPositions(req.user.id);
    return res.json({ positions });
  } catch (error: any) {
    console.error('Error fetching staking positions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Stake funds
router.post('/stake', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { poolId, amount } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!poolId || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Pool ID and positive amount are required' });
  }

  try {
    const positionId = await StakingService.stakeFunds(req.user.id, poolId, amount);
    return res.status(201).json({
      message: 'Funds successfully staked',
      positionId,
    });
  } catch (error: any) {
    console.error('Staking error:', error);
    return res.status(400).json({ error: error.message || 'Failed to stake funds' });
  }
});

// 4. Claim rewards
router.post('/claim', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { positionId } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!positionId) {
    return res.status(400).json({ error: 'Position ID is required' });
  }

  try {
    const claimedRewards = await StakingService.claimRewards(req.user.id, positionId);
    return res.json({
      message: 'Rewards claimed successfully',
      claimedRewards,
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    return res.status(400).json({ error: error.message || 'Failed to claim rewards' });
  }
});

// 5. Unstake funds
router.post('/unstake', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { positionId } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!positionId) {
    return res.status(400).json({ error: 'Position ID is required' });
  }

  try {
    const result = await StakingService.unstakeFunds(req.user.id, positionId);
    return res.json({
      message: 'Funds successfully unstaked and returned to wallet',
      ...result,
    });
  } catch (error: any) {
    console.error('Unstaking error:', error);
    return res.status(400).json({ error: error.message || 'Failed to unstake funds' });
  }
});

export default router;
