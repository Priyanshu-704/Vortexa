import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PORT, NODE_ENV } from './config';
import { initializeDatabase } from './db';
import { runSeed } from './seed';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import stakingRoutes from './routes/staking';
import referralRoutes from './routes/referral';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import ArbitrageEngine from './services/arbitrage';

const app = express();

// Base middleware configurations
app.use(helmet());
app.use(
  cors({
    origin: NODE_ENV === 'production' ? 'https://vortexa-investment.com' : 'http://localhost:5173', // Vite standard port
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Rate Limiter to prevent brute-force and DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 10000, // Limit each IP to 100 requests (or 10000 in dev) per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 20 : 1000, // Limit login/register attempts (or 1000 in dev)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login or registration attempts. Please try again later.' },
});

// Apply rate limiter to all APIs
app.use('/api', apiLimiter);

// Bind Authentication Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Database and Server
async function startServer() {
  try {
    await initializeDatabase();
    await runSeed();
    await ArbitrageEngine.startEngine();
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`Vortexa server is running in ${NODE_ENV} mode on port ${PORT}`);
      });
    } else {
      console.log(`Vortexa database initialized for testing (server listening bypassed).`);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
export default app;
