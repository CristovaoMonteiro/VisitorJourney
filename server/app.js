const path = require('path');
const express = require('express');

const productsRouter = require('./routes/products');
const { createEventsRouter } = require('./routes/events');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** Parses TRUST_PROXY ("1", "true", "loopback"...) for hosts behind a reverse proxy such as Render. */
function parseTrustProxy(value) {
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

/**
 * Builds the Express app without starting it, so tests can import it
 * without opening a port.
 * @param {{ rateLimit?: import('express').RequestHandler }} [options]
 */
function createApp({ rateLimit } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Needed so req.ip is the client (not the proxy) for rate limiting.
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/products', productsRouter);
  app.use('/api/events', createEventsRouter(rateLimit ? { rateLimit } : undefined));

  // Unknown API routes return JSON, never the HTML 404 page.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // `extensions` lets /collection resolve to collection.html (clean URLs).
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
