const path = require('path');
const express = require('express');

const productsRouter = require('./routes/products');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Builds the Express app without starting it, so tests can import it
 * without opening a port.
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/products', productsRouter);

  // Unknown API routes return JSON, never the HTML 404 page.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // `extensions` lets /collection resolve to collection.html (clean URLs).
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
