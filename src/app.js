const express = require('express');
const peopleRoutes = require('./routes/people');
const applicationRoutes = require('./routes/applications');
const alignmentRoutes = require('./routes/alignments');
const approvalRoutes = require('./routes/approvals');
const config = require('./config/env');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    const { corsOrigins } = config;
    const origin = req.headers.origin;
    const allowAll = corsOrigins.includes('*');
    const isAllowedOrigin = allowAll || (origin && corsOrigins.includes(origin));

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowAll ? '*' : origin);
    }

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    );

    const requestHeaders =
      req.headers['access-control-request-headers'] ||
      'Content-Type, Authorization, X-Requested-With';
    res.setHeader('Access-Control-Allow-Headers', requestHeaders);
    res.setHeader('Vary', 'Origin');

    if (!allowAll && isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      res.status(isAllowedOrigin ? 204 : 403).end();
      return;
    }

    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/people', peopleRoutes);
  app.use('/applications', applicationRoutes);
  app.use('/alignments', alignmentRoutes);
  app.use('/approvals', approvalRoutes);

  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error.'
    });
  });

  return app;
}

module.exports = createApp;
