const express = require('express');
const peopleRoutes = require('./routes/people');
const applicationRoutes = require('./routes/applications');
const alignmentRoutes = require('./routes/alignments');
const approvalRoutes = require('./routes/approvals');

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
