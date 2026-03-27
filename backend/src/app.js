'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const fichesRouter = require('./routes/fiches');
const employesRouter = require('./routes/employes');
const exportRouter = require('./routes/export');
const settingsRouter = require('./routes/settings');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const { version } = require('../package.json');

// Security middleware
app.use(helmet({
  // Allow embedding in same-origin iframes and cross-origin images (LAN use)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS - allow all origins for LAN use
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' })); // 10mb to accommodate base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'feraille-app-backend',
    version,
  });
});

// Version endpoint (used by Android/Windows apps for update check)
app.get('/api/version', (req, res) => {
  res.json({ version });
});

// Routes
app.use('/api/fiches', fichesRouter);
app.use('/api/employes', employesRouter);
app.use('/api/export', exportRouter);
app.use('/api/settings', settingsRouter);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Feraille App backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
