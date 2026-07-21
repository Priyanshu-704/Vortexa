import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { StakingPool, StakingPosition } from '../types';
import Swal from 'sweetalert2';

export default function Staking() {
  const { getHeaders, API_BASE, fetchBalance, showNotificationAlert } = useApp();

  const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
  const [userPositions, setUserPositions] = useState<StakingPosition[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchStakingPools = async () => {
    try {
      const res = await fetch(`${API_BASE}/staking/pools`);
      const data = await res.json();
      if (res.ok) setStakingPools(data.pools);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserPositions = async () => {
    try {
      const res = await fetch(`${API_BASE}/staking/positions`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok) setUserPositions(data.positions);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStakingPools();
    fetchUserPositions();
  }, []);

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const amt = parseFloat(stakeAmount);
    if (!selectedPoolId || isNaN(amt) || amt <= 0) {
      setErrorMessage('Select a pool and enter a positive USDT amount');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/staking/stake`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ poolId: selectedPoolId, amount: amt })
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to stake');
      } else {
        setStakeAmount('');
        fetchBalance();
        fetchUserPositions();
        showNotificationAlert('Allocated Staking!', 'Successfully allocated funds to staking pool!', 'success');
      }
    } catch (err) {
      setErrorMessage('Server error during staking');
    }
  };

  const handleClaimRewards = async (posId: string) => {
    try {
      const res = await fetch(`${API_BASE}/staking/claim`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ positionId: posId })
      });
      const data = await res.json();
      if (!res.ok) {
        showNotificationAlert('Error', data.error || 'Claim failed', 'error');
      } else {
        fetchBalance();
        fetchUserPositions();
        showNotificationAlert('Claim Success!', `Claimed ${data.claimedRewards} USDT successfully!`, 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnstake = async (posId: string) => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will claim all rewards and release your principal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, unstake!',
      cancelButtonText: 'Cancel',
      background: '#0d1426',
      color: '#fff',
      confirmButtonColor: '#ff1744',
      cancelButtonColor: '#3085d6'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await fetch(`${API_BASE}/staking/unstake`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ positionId: posId })
          });
          const data = await res.json();
          if (!res.ok) {
            showNotificationAlert('Error', data.error || 'Unstake failed', 'error');
          } else {
            fetchBalance();
            fetchUserPositions();
            showNotificationAlert('Unstaked Successfully!', `Returned principal: ${data.principal} USDT and earnings: ${data.rewards} USDT.`, 'success');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {stakingPools.map((pool) => (
          <div key={pool.id} className="glass-panel interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <span className={`badge ${pool.id === 'flexible' ? 'badge-cyan' : 'badge-gold'}`} style={{ marginBottom: '12px' }}>
                {pool.id === 'flexible' ? 'Flexible' : 'Locked'}
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{pool.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lock duration: {pool.lockDurationDays === 0 ? 'None' : `${pool.lockDurationDays} days`}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Staking APY</p>
              <h2 style={{ fontSize: '32px', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {(pool.apy * 100).toFixed(0)}%
              </h2>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px', fontSize: '13px' }}
                onClick={() => { setSelectedPoolId(pool.id); setStakeAmount(''); setErrorMessage(''); }}
              >
                Select Pool
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Allocate Investment</h3>
          {selectedPoolId ? (
            <form onSubmit={handleStake} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected Pool:</span>{' '}
                <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  {stakingPools.find(p => p.id === selectedPoolId)?.name}
                </span>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Amount to Stake (USDT)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Min 10 USDT"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  required
                />
              </div>
              {errorMessage && (
                <div style={{ color: '#ff1744', fontSize: '13.5px', marginTop: '4px' }}>
                  {errorMessage}
                </div>
              )}
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Stake Now</button>
            </form>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>Please select a pool above.</p>
          )}
        </div>

        <div className="glass-panel">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>My Active Positions</h3>
          {userPositions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No active staking positions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {userPositions.map((pos) => (
                <div key={pos.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>{pos.pool_id === 'flexible' ? 'Flexible Pool' : `${pos.pool_id.replace('fixed', '')}-Day Fixed`}</h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>Principal: {pos.amount} USDT | Yield: {(pos.apy * 100).toFixed(0)}% APY</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '15px' }}>+{pos.pendingRewards.toFixed(5)} USDT</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleClaimRewards(pos.id)}>Claim</button>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px', background: 'rgba(255,23,68,0.15)', border: '1px solid rgba(255,23,68,0.3)', color: '#ff1744', boxShadow: 'none' }}
                        onClick={() => handleUnstake(pos.id)}
                        disabled={!pos.isMatured && pos.pool_id !== 'flexible'}
                      >
                        Unstake
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
