# Vortexa: AI-Powered Web3 Staking & Arbitrage Portal

Vortexa is an enterprise-grade Web3 investment ecosystem combining **DeFi staking pools**, a **multi-level marketing (MLM) referral engine**, a **self-healing AI Arbitrage Engine**, and **strict admin oversight controls** into a unified, secure portal.

---

## Key Core Modules

### 1. Secure Authentication & Profile Settings
- **Email Registration & OTP Verification**: Users register using their email handle and receive a 6-digit OTP code to verify and activate their account.
- **Forgot Password**: Password reset request triggers a secure, time-limited OTP code verification.
- **Profile Customization**: Dashboard settings allowing users to alter display names, timezone configurations, and notification preferences.

### 2. Web3 Wallet & Escrow Ledger
- **Wallet Connection**: Cryptographic signature validation (`ethers.verifyMessage`) to verify wallet possession before linking.
- **Escrow-Based Withdrawals**: High-value withdrawals route to an administrative queue requiring an administrator authorization PIN (`9999`) before final processing.

### 3. DeFi Staking Pools
- **Flexible Pool**: APY yield rate set to **6%** with zero maturity lock-up limitations.
- **Locked Pools**: Fixed terms for **30, 90, or 180 days** offering compound APY rates up to **30%**.
- **Real-Time Interest**: Yield calculations are computed dynamically down to the second on the backend database.

### 4. Compensation & MLM Engine
- **Direct Deposit Bonuses**: Automatic payout of **5% (Tier 1)**, **3% (Tier 2)**, and **1% (Tier 3)** on direct/indirect downline deposits.
- **Passive Yield Share**: Auto-distribution of **10% / 5% / 2%** matching downline yield performance.

### 5. AI Arbitrage Engine & Volatility Umbrella Rule
- **Arbitrage Scan Loop**: Continuously monitor and simulate trading execution between Uniswap, Sushiswap, and Curve.
- **Umbrella Rule Circuit Breaker**: If standard price volatility breaches **8%**, the engine automatically pauses active trades and secures staker assets back to stable USDT.

---

## Directory Map

```
Vortexa/
├── backend/
│   ├── src/
│   │   ├── routes/        # Express API endpoints (auth, staking, referral, admin)
│   │   ├── services/      # Business logic modules (arbitrage engine, staking, MLM)
│   │   ├── middleware/    # Auth, JWT, and RBAC token filters
│   │   ├── utils/         # Crypto helper functions (AES-256-GCM)
│   │   ├── db.ts          # SQLite database connection and initial schema
│   │   └── index.ts       # Application entry point
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx        # React client user interface
    │   ├── index.css      # Space-dark neon custom styling theme
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Local Setup & Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### 1. Set Up the Backend
1. Open a terminal in `/backend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The backend will boot up, initialize `vortexa.db` automatically, and run on port 5000.*

### 2. Set Up the Frontend
1. Open a separate terminal in `/frontend` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboard at: `http://localhost:5173`.

---

## Testing Matrix

To execute backend integration tests:
```bash
cd backend
npx vitest run
```
