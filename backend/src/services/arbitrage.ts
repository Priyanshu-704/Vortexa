import Web3Service from './web3';
import { run, get, all, transaction } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { logAudit } from '../utils/logger';

class AIArbitrageEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private isScanning: boolean = false;
  private readonly tradingVolume = 10000; // Mock trade volume in USDT

  constructor() {
    this.startEngine();
  }

  /**
   * Starts the background price scanner and arbitrage execution.
   */
  public async startEngine() {
    if (process.env.NODE_ENV === 'test') {
      console.log('AI Arbitrage Engine background scanner bypassed during test environment.');
      return;
    }
    const state = await get<{ status: string }>('SELECT status FROM ai_state WHERE id = "global"');
    if (state && state.status === 'RUNNING' && !this.intervalId) {
      console.log('AI Arbitrage Engine is starting background scanner...');
      this.intervalId = setInterval(() => this.scanAndExecute(), 6000); // Scan every 6 seconds
    }
  }

  /**
   * Pauses the background scanner.
   */
  public stopEngine() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('AI Arbitrage Engine background scanner paused.');
    }
  }

  /**
   * Executes a scan cycle to detect and execute arbitrage opportunities.
   */
  public async scanAndExecute() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      // 1. Fetch AI parameters & status
      const systemState = await get<{ status: string; umbrella_rule_active: number; current_volatility: number }>(
        'SELECT status, umbrella_rule_active, current_volatility FROM ai_state WHERE id = "global"'
      );

      if (!systemState || systemState.status !== 'RUNNING') {
        this.stopEngine();
        this.isScanning = false;
        return;
      }

      // Check volatility for Phase 7 Umbrella Rule
      if (systemState.current_volatility > 0.08) {
        // High volatility trigger
        if (systemState.umbrella_rule_active === 0) {
          await this.triggerUmbrellaRule(systemState.current_volatility);
        }
        this.isScanning = false;
        return;
      }

      // 2. Market Scan (Phase 6)
      const prices = Web3Service.getDEXPrices();
      const dexes = Object.keys(prices) as ('uniswap' | 'sushiswap' | 'curve')[];

      let buyDex = dexes[0];
      let sellDex = dexes[0];

      for (const dex of dexes) {
        if (prices[dex] < prices[buyDex]) buyDex = dex;
        if (prices[dex] > prices[sellDex]) sellDex = dex;
      }

      const buyPrice = prices[buyDex];
      const sellPrice = prices[sellDex];
      const spread = sellPrice - buyPrice;
      const profitPercentage = spread / buyPrice;

      // profiability threshold: 0.25% spread
      const threshold = 0.0025;

      if (profitPercentage > threshold) {
        // Profitable opportunity detected!
        const profitAmount = Number((this.tradingVolume * profitPercentage).toFixed(6));
        const txHash = Web3Service.generateTxHash();

        await transaction(async () => {
          const id = uuidv4();
          // Record arbitrage trade
          const dexPair = 'ETH/USDT';
          await run(
            'INSERT INTO ai_trades (id, dex_pair, buy_dex, sell_dex, profit_percentage, profit_amount, amount_used, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, dexPair, buyDex.toUpperCase(), sellDex.toUpperCase(), profitPercentage, profitAmount, this.tradingVolume, txHash]
          );

          // Update DEX pools (arbitrage corrects the price difference)
          const ethBought = this.tradingVolume / buyPrice;
          Web3Service.adjustDEXReserves(buyDex, -ethBought * 0.3, this.tradingVolume * 0.3); // Buying ETH increases price on buyDex
          Web3Service.adjustDEXReserves(sellDex, ethBought * 0.3, -this.tradingVolume * 0.3); // Selling ETH decreases price on sellDex

          // Distribute a tiny fraction of the profit (e.g. 5%) to active stakers to represent dynamic yield
          const activeStakers = await all<{ user_id: string; balance_usdt: number }>('SELECT DISTINCT user_id FROM staking_positions WHERE status = "STAKING"');
          if (activeStakers.length > 0) {
            const rewardPerUser = Number((profitAmount * 0.05 / activeStakers.length).toFixed(6));
            if (rewardPerUser > 0) {
              for (const user of activeStakers) {
                await run('UPDATE wallets SET balance_usdt = balance_usdt + ? WHERE user_id = ?', [rewardPerUser, user.user_id]);
                // Log interest earned transaction for user
                await run(
                  'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
                  [uuidv4(), user.user_id, 'ARBITRAGE_PROFIT', rewardPerUser, 'COMPLETED', Web3Service.generateTxHash()]
                );
              }
            }
          }
        });

        console.log(`[AI ARBITRAGE] Executed Buy on ${buyDex.toUpperCase()} (${buyPrice.toFixed(2)}) and Sell on ${sellDex.toUpperCase()} (${sellPrice.toFixed(2)}). Profit: ${profitAmount.toFixed(4)} USDT.`);
      } else {
        // No profitable opportunity, slightly fluctuate prices to simulate standard market volatility
        for (const dex of dexes) {
          const randomEthChange = (Math.random() - 0.5) * 5;
          const randomUSDTChange = (Math.random() - 0.5) * 5000;
          Web3Service.adjustDEXReserves(dex, randomEthChange, randomUSDTChange);
        }
      }
    } catch (error) {
      console.error('AI Arbitrage Scan cycle failed:', error);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Phase 7: Trigger the Umbrella Rule during extreme market volatility.
   */
  public async triggerUmbrellaRule(volatility: number) {
    try {
      await transaction(async () => {
        // 1. Update AI state to pause and toggle umbrella active
        await run(
          'UPDATE ai_state SET status = "PAUSED", umbrella_rule_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = "global"'
        );

        // 2. Fetch all active positions and convert stakers' assets to USDT cash
        // In real-world, we convert exposed assets. In our platform, we pause aggressive trading and notify stakers.
        // Let's create an audit log and system transaction representing "Capital Protection Lock"
        const users = await all<{ id: string }>('SELECT id FROM users');
        for (const user of users) {
          await run(
            'INSERT INTO transactions (id, user_id, type, amount, status, tx_hash) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), user.id, 'ARBITRAGE_PROFIT', 0, 'COMPLETED', '0xUMBRELLA_RULE_PROTECT_ACTIVE']
          );
        }

        await logAudit(
          null,
          'UMBRELLA_RULE_ACTIVATED',
          `Umbrella Rule activated due to high volatility (${(volatility * 100).toFixed(2)}%). All automated trading paused, assets protected in USDT.`
        );
      });

      this.stopEngine();
      console.log('!!! UMBRELLA RULE ACTIVATED: Price scanning paused. Liquidated assets safely in USDT !!!');
    } catch (error) {
      console.error('Failed to trigger Umbrella Rule:', error);
    }
  }

  /**
   * Reset / Deactivate Umbrella Rule and resume trading (Phase 7 / Admin workflow)
   */
  public async deactivateUmbrellaRule() {
    await run(
      'UPDATE ai_state SET status = "RUNNING", umbrella_rule_active = 0, current_volatility = 0.02, updated_at = CURRENT_TIMESTAMP WHERE id = "global"'
    );
    await logAudit(null, 'UMBRELLA_RULE_DEACTIVATED', 'Umbrella Rule deactivated. Volatility stabilized. Resuming AI Arbitrage Engine.');
    await this.startEngine();
  }

  /**
   * Set simulated volatility level (Phase 7 helper)
   */
  public async setSimulatedVolatility(volatility: number) {
    await run('UPDATE ai_state SET current_volatility = ? WHERE id = "global"', [volatility]);
    console.log(`Simulated volatility set to: ${volatility}`);
    // If running, execute immediately to trigger rule
    if (volatility > 0.08) {
      await this.scanAndExecute();
    }
  }
}

export const ArbitrageEngine = new AIArbitrageEngine();
export default ArbitrageEngine;
