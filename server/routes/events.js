const express = require('express');
const mongoose = require('mongoose');

const Event = require('../models/Event');
const { validateEvent } = require('../events/validateEvent');
const { LIMITS } = require('../events/eventTypes');
const { createRateLimiter } = require('../middleware/rateLimit');

const DUPLICATE_KEY = 11000;

/**
 * POST /api/events  body: { events: [ ...1-20 events ] }
 * The batch is all-or-nothing on validation, so the client gets a clear
 * error list instead of a silently partial write.
 */
function createEventsRouter({ rateLimit = createRateLimiter() } = {}) {
  const router = express.Router();

  router.post('/', rateLimit, async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Event storage is not available' });
    }

    const events = req.body?.events;
    if (!Array.isArray(events) || events.length === 0 || events.length > LIMITS.maxEventsPerRequest) {
      return res
        .status(400)
        .json({ error: `Body must be { events: [...] } with 1-${LIMITS.maxEventsPerRequest} events` });
    }

    const now = new Date();
    const results = events.map((raw) => validateEvent(raw, { now }));
    const invalid = results
      .map((r, index) => (r.ok ? null : { index, errors: r.errors }))
      .filter(Boolean);
    if (invalid.length > 0) {
      return res.status(400).json({ error: 'Invalid events', details: invalid });
    }

    const docs = results.map((r) => ({ ...r.value, receivedAt: now }));
    try {
      await Event.insertMany(docs, { ordered: false });
      return res.status(202).json({ accepted: docs.length, duplicates: 0 });
    } catch (err) {
      // Re-sent events (same eventId) are expected after network retries: ignore them.
      const writeErrors = err.writeErrors ?? [];
      const onlyDuplicates =
        writeErrors.length > 0 && writeErrors.every((e) => (e.code ?? e.err?.code) === DUPLICATE_KEY);
      if (!onlyDuplicates) return next(err);
      const accepted = err.result?.insertedCount ?? docs.length - writeErrors.length;
      return res.status(202).json({ accepted, duplicates: writeErrors.length });
    }
  });

  return router;
}

module.exports = { createEventsRouter };
