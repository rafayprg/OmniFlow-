import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { r2Db } from './services/r2DatabaseService.js';
import { getR2Client, R2_BUCKET, R2_PREFIX } from './config/r2.js';

import customerRoutes from './routes/customerRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Middleware to ensure R2 Database Engine is initialized for serverless / local calls
app.use(async (req, res, next) => {
  try {
    await r2Db.init();
  } catch (err) {
    console.error('R2 Database initialization error:', err.message);
  }
  next();
});

// Health check endpoint (both /api/health and /health)
const healthHandler = async (req, res) => {
  let r2Status = 'Disconnected';
  let r2Error = null;
  const isR2Configured = Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID);

  if (isR2Configured) {
    try {
      await r2Db.init();
      r2Status = 'Cloudflare R2 Live Connected';
    } catch (err) {
      r2Status = 'Connection Error';
      r2Error = err.message;
    }
  } else {
    r2Status = 'R2 Memory Storage (Local Fallback)';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: r2Status,
    storage: 'Cloudflare R2 Object Storage',
    bucket: R2_BUCKET,
    dataPrefix: R2_PREFIX,
    r2Error,
    r2Configured: isR2Configured
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Mount Routes - Support both with and without /api prefix for Vercel Serverless Rewrites
app.use('/api/customers', customerRoutes);
app.use('/customers', customerRoutes);

app.use('/api/leads', leadRoutes);
app.use('/leads', leadRoutes);

app.use('/api/agents', agentRoutes);
app.use('/agents', agentRoutes);

app.use('/api/stats', statsRoutes);
app.use('/stats', statsRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

// Root route for API verification
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'OmniFlow CRM / LeadsPro',
    storageEngine: 'Cloudflare R2 Object Storage',
    bucket: R2_BUCKET,
    message: 'Backend is running live with Cloudflare R2'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start local server if run directly (NEVER on Vercel serverless)
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, async () => {
    console.log(`🚀 OmniFlow CRM Backend running on http://localhost:${PORT}`);
    try {
      await r2Db.init();
      console.log(`☁️ Cloudflare R2 Connected: Bucket "${R2_BUCKET}" [Prefix: "${R2_PREFIX}"]`);
    } catch (e) {
      console.log('💡 Note: Check R2 credentials in .env.');
    }
  });
}

export default app;
