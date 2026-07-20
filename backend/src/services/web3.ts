import { ethers } from 'ethers';
import crypto from 'crypto';

export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  blockNumber: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  timestamp: string;
}

class BlockchainSimulationService {
  private mockUserUSDTBalances: Map<string, number> = new Map();
  private mockDEXBalances: Map<string, { usdt: number; eth: number }> = new Map();
  private transactions: Map<string, BlockchainTransaction> = new Map();
  private currentBlock: number = 21000000;

  constructor() {
    // Initialize mock liquidity pools for DEXes
    this.mockDEXBalances.set('uniswap', { usdt: 10000000, eth: 3000 });
    this.mockDEXBalances.set('sushiswap', { usdt: 8000000, eth: 2450 });
    this.mockDEXBalances.set('curve', { usdt: 15000000, eth: 4500 });
  }

  /**
   * Verifies an Ethereum personal sign signature.
   */
  public verifySignature(address: string, message: string, signature: string): boolean {
    try {
      // Recover the address from the message and signature using ethers
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generates a mock transaction hash for auditable records.
   */
  public generateTxHash(): string {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Mocks a USDT transfer on-chain.
   */
  public async simulateUSDTTransfer(from: string, to: string, amount: number): Promise<BlockchainTransaction> {
    const txHash = this.generateTxHash();
    this.currentBlock += 1;

    const tx: BlockchainTransaction = {
      hash: txHash,
      from,
      to,
      amount,
      blockNumber: this.currentBlock,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };

    // Update mock balances
    const senderBalance = this.mockUserUSDTBalances.get(from.toLowerCase()) || 100000; // Default simulated starting wallet has 100k USDT
    if (senderBalance < amount) {
      tx.status = 'FAILED';
      this.transactions.set(txHash, tx);
      throw new Error('Simulation failed: Insufficient USDT balance in wallet');
    }

    this.mockUserUSDTBalances.set(from.toLowerCase(), senderBalance - amount);
    const receiverBalance = this.mockUserUSDTBalances.get(to.toLowerCase()) || 0;
    this.mockUserUSDTBalances.set(to.toLowerCase(), receiverBalance + amount);

    this.transactions.set(txHash, tx);
    return tx;
  }

  /**
   * Fetches mock DEX token prices for AI arbitrage engine.
   * Returns price of ETH in terms of USDT.
   */
  public getDEXPrices(): { uniswap: number; sushiswap: number; curve: number } {
    const uni = this.mockDEXBalances.get('uniswap')!;
    const sushi = this.mockDEXBalances.get('sushiswap')!;
    const curve = this.mockDEXBalances.get('curve')!;

    return {
      uniswap: uni.usdt / uni.eth,
      sushiswap: sushi.usdt / sushi.eth,
      curve: curve.usdt / curve.eth,
    };
  }

  /**
   * Simulates arbitrage trading on DEX pools to change reserves/prices.
   */
  public adjustDEXReserves(dex: string, ethDelta: number, usdtDelta: number) {
    const balance = this.mockDEXBalances.get(dex.toLowerCase());
    if (balance) {
      balance.eth = Math.max(100, balance.eth + ethDelta);
      balance.usdt = Math.max(10000, balance.usdt + usdtDelta);
      this.mockDEXBalances.set(dex.toLowerCase(), balance);
    }
  }

  public getWalletUSDTBalance(address: string): number {
    return this.mockUserUSDTBalances.get(address.toLowerCase()) ?? 100000; // Standard demo wallet balance
  }

  public setWalletUSDTBalance(address: string, amount: number) {
    this.mockUserUSDTBalances.set(address.toLowerCase(), amount);
  }
}

export const Web3Service = new BlockchainSimulationService();
export default Web3Service;
