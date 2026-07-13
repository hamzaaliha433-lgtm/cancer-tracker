// server.js — الخادم الرئيسي
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const { initDB }  = require('./database');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Security middleware ───────────────────────────────────────────────────
app.use(helmet());

// CORS: dev → accept any origin (covers file://, null, any port)
// production → restrict to ALLOWED_ORIGINS
const isProd = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProd
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false)
    : true,
  credentials: true,
}));

// Rate limiting — limit each IP to 100 requests per 15 min
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'طلبات كثيرة جداً — يرجى الانتظار قليلاً' },
});
app.use('/api/', limiter);

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'محاولات تسجيل دخول كثيرة — يرجى الانتظار 15 دقيقة' },
});
app.use('/api/auth/', authLimiter);

// ─── Body parser (limit 5MB for base64 images) ────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor',  require('./routes/doctor'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'خطأ داخلي في الخادم' });
});

// ─── Start server ─────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 API health: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
