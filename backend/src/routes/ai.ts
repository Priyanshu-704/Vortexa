import { Router, Response } from 'express';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { all, get } from '../db';
import ArbitrageEngine from '../services/arbitrage';
import Web3Service from '../services/web3';

const router = Router();

// 1. Get current AI status and stats
router.get('/status', async (req, res) => {
  try {
    const aiState = await get<{ status: string; umbrella_rule_active: number; current_volatility: number; updated_at: string }>(
      'SELECT status, umbrella_rule_active, current_volatility, updated_at FROM ai_state WHERE id = "global"'
    );
    const tradesCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM ai_trades');
    const totalProfit = await get<{ total: number }>('SELECT SUM(profit_amount) as total FROM ai_trades');
    const recentTrades = await all('SELECT * FROM ai_trades ORDER BY timestamp DESC LIMIT 5');

    return res.json({
      status: aiState?.status || 'PAUSED',
      umbrellaRuleActive: aiState?.umbrella_rule_active === 1,
      currentVolatility: aiState?.current_volatility || 0.02,
      updatedAt: aiState?.updated_at,
      totalExecutedTrades: tradesCount?.count || 0,
      totalProfitUSDT: totalProfit?.total || 0,
      recentTrades,
    });
  } catch (error) {
    console.error('Error fetching AI status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get list of all executed trades (paginated/limited)
router.get('/trades', async (req, res) => {
  try {
    const trades = await all('SELECT * FROM ai_trades ORDER BY timestamp DESC LIMIT 50');
    return res.json({ trades });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Get current simulated DEX prices
router.get('/prices', (req, res) => {
  const prices = Web3Service.getDEXPrices();
  return res.json({ prices });
});

// 4. Admin endpoint to change/toggle AI status (start/pause)
router.post('/toggle', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;

  if (status !== 'RUNNING' && status !== 'PAUSED') {
    return res.status(400).json({ error: 'Invalid status. Must be RUNNING or PAUSED.' });
  }

  try {
    if (status === 'RUNNING') {
      await ArbitrageEngine.deactivateUmbrellaRule(); // Resets umbrella and runs engine
    } else {
      ArbitrageEngine.stopEngine();
      await ArbitrageEngine.setSimulatedVolatility(0.02); // Reset volatility
    }
    return res.json({ message: `AI engine status set to ${status}` });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Admin endpoint to set/simulate market volatility (to test Phase 7 Umbrella Rule)
router.post('/volatility', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  const { volatility } = req.body;

  if (volatility === undefined || isNaN(volatility) || volatility < 0) {
    return res.status(400).json({ error: 'Valid positive volatility rate is required' });
  }

  try {
    await ArbitrageEngine.setSimulatedVolatility(volatility);
    return res.json({ message: `Volatility set to ${volatility}. Check AI status to see if Umbrella Rule triggered.` });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
