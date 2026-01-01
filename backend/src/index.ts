import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { startQuotaRefreshScheduler } from './services/quotaRefreshScheduler';

// 路由
import cardsRouter from './routes/cards';
import schemesRouter from './routes/schemes';
import paymentMethodsRouter from './routes/paymentMethods';
import channelsRouter from './routes/channels';
import transactionsRouter from './routes/transactions';
import quotaRouter from './routes/quota';
import calculationRouter from './routes/calculation';
import settingsRouter from './routes/settings';

dotenv.config();

const app = express();
app.set('trust proxy', 1); // ensure rate limiter can read X-Forwarded-For behind proxy

// CORS 設定：支援白名單，多個來源以逗號分隔
const allowedOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

// 中間件
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 根路徑
app.get('/', (_req, res) => {
  res.json({
    message: 'Rewards API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      cards: '/api/cards',
      schemes: '/api/schemes',
      paymentMethods: '/api/payment-methods',
      channels: '/api/channels',
      transactions: '/api/transactions',
      quota: '/api/quota',
      calculation: '/api/calculation',
      settings: '/api/settings',
    },
  });
});

// 健康檢查
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// API 路由
app.use('/api/cards', cardsRouter);
app.use('/api/schemes', schemesRouter);
app.use('/api/payment-methods', paymentMethodsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/quota', quotaRouter);
app.use('/api/calculation', calculationRouter);
app.use('/api/settings', settingsRouter);
// ⚠️ 正式版移除資料匯入與種子初始化 API，避免被誤用清空或修改資料庫。

// 404 處理（必須在所有路由之後，錯誤處理之前）
app.use((_req, res) => {
  return res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: _req.path,
  });
});

// 錯誤處理
app.use(errorHandler);

const startServer = async () => {
  // 啟動伺服器
  // Railway 和其他雲端平台需要監聽 0.0.0.0 而不是 localhost
  const port = parseInt(env.PORT, 10);
  const server = app.listen(port, env.HOST, () => {
    console.log(`🚀 後端服務運行於 http://${env.HOST}:${port}`);
    
    // 啟動額度刷新定時任務 (混合模式：可透過環境變數控制是否啟用)
    if (process.env.ENABLE_QUOTA_REFRESH_SCHEDULER === 'true') {
      startQuotaRefreshScheduler();
    } else {
      console.log('💡 額度刷新定時任務已停用 (ENABLE_QUOTA_REFRESH_SCHEDULER 未設定或為 false)');
    }
  });

  // 處理端口佔用錯誤
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ 端口 ${env.PORT} 已被佔用，請關閉佔用該端口的進程或更改 PORT 環境變數`);
      console.error(`💡 提示：可以使用以下命令查看佔用端口的進程：`);
      console.error(`   netstat -ano | findstr :${env.PORT}`);
      console.error(`   然後使用 taskkill /F /PID <進程ID> 關閉進程`);
      process.exit(1);
    } else {
      console.error('❌ 伺服器啟動錯誤:', error);
      process.exit(1);
    }
  });
};

startServer();

// 優雅關閉
process.on('SIGTERM', async () => {
  console.log('SIGTERM 信號 received: 關閉 HTTP 伺服器');
  await pool.end();
  process.exit(0);
});

