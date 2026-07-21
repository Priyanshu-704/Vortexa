import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { DexPrices } from '../types';

export default function AiMonitor() {
  const { aiStatus, API_BASE } = useApp();
  const [dexPrices, setDexPrices] = useState<DexPrices>({ prices: { uniswap: 3400, sushiswap: 3405, curve: 3398 } });

  const fetchPrices = async () => {
    try {
      const resPrices = await fetch(`${API_BASE}/ai/prices`);
      const dataPrices = await resPrices.json();
      if (resPrices.ok) setDexPrices(dataPrices);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
      <div className="glass-panel">
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Arbitrage scanner activity</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Asset</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Buy Dex</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Sell Dex</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Spread</th>
                <th style={{ textAlign: 'left', padding: '10px 8px' }}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {aiStatus.recentTrades.map((t: any) => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{t.dex_pair}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--accent-cyan)' }}>{t.buy_dex}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--accent-purple)' }}>{t.sell_dex}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--accent-green)' }}>+{(t.profit_percentage * 100).toFixed(3)}%</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{t.profit_amount.toFixed(4)} USDT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>Core Statistics</h3>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Engine Status</p>
          <span className={`badge ${aiStatus.status === 'RUNNING' ? 'badge-green' : 'badge-red'}`}>
            {aiStatus.status}
          </span>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: 'var(--text-secondary)' }}>DEX Price Spread Analyzer</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Uniswap ETH:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${dexPrices.prices.uniswap.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Sushiswap ETH:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${dexPrices.prices.sushiswap.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Curve ETH:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>${dexPrices.prices.curve.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
