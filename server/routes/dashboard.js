const express = require('express');
const mongoose = require('mongoose');

const Event = require('../models/Event');
const { buildModel, overview, listVisitors, visitorDetail, dayKey, addDays, SEGMENTS, SORT_KEYS } = require('../dashboard/analytics');

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_RANGE_DAYS = 400;

/**
 * Read-only dashboard API.
 * The analytics model (sessions + segmented visitors) is rebuilt from MongoDB
 * at most once per `cacheMs`, then every filter is applied in memory.
 */
function createDashboardRouter({ cacheMs = 60_000 } = {}) {
  const router = express.Router();
  let cache = { model: null, expiresAt: 0, pending: null };

  async function getModel() {
    if (cache.model && Date.now() < cache.expiresAt) return cache.model;
    // Concurrent requests share one rebuild instead of each querying MongoDB.
    cache.pending ??= Event.find({}, { _id: 0, receivedAt: 0 })
      .lean()
      .then((events) => {
        cache = { model: buildModel(events, { now: new Date() }), expiresAt: Date.now() + cacheMs, pending: null };
        return cache.model;
      })
      .catch((err) => {
        cache.pending = null;
        throw err;
      });
    return cache.pending;
  }

  router.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Analytics storage is not available' });
    res.set('Cache-Control', 'no-store');
    return next();
  });

  /** Parses and validates the shared filter query; defaults to the last 30 days. */
  function parseFilters(query) {
    const today = dayKey(Date.now());
    const to = DAY_RE.test(query.to ?? '') ? query.to : today;
    const from = DAY_RE.test(query.from ?? '') ? query.from : addDays(to, -29);
    if (from > to) return { error: '`from` must be on or before `to`' };
    if (addDays(from, MAX_RANGE_DAYS) < to) return { error: `Date range is limited to ${MAX_RANGE_DAYS} days` };

    const filters = { from, to };
    if (query.segment) {
      if (!SEGMENTS.includes(query.segment)) return { error: 'Unknown segment' };
      filters.segment = query.segment;
    }
    if (query.device) {
      if (!['desktop', 'mobile'].includes(query.device)) return { error: 'Unknown device' };
      filters.device = query.device;
    }
    if (query.source) {
      if (typeof query.source !== 'string' || query.source.length > 253) return { error: 'Invalid source' };
      filters.source = query.source;
    }
    return { filters };
  }

  router.get('/overview', async (req, res, next) => {
    const { filters, error } = parseFilters(req.query);
    if (error) return res.status(400).json({ error });
    try {
      return res.json(overview(await getModel(), filters));
    } catch (err) {
      return next(err);
    }
  });

  router.get('/visitors', async (req, res, next) => {
    const { filters, error } = parseFilters(req.query);
    if (error) return res.status(400).json({ error });
    const sort = SORT_KEYS.includes(req.query.sort) ? req.query.sort : 'lastActivity';
    const order = req.query.order === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(5, Number.parseInt(req.query.pageSize, 10) || 25));
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 36) : '';
    try {
      return res.json(listVisitors(await getModel(), filters, { sort, order, page, pageSize, q }));
    } catch (err) {
      return next(err);
    }
  });

  router.get('/visitors/:id', async (req, res, next) => {
    if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid visitor id' });
    try {
      const detail = visitorDetail(await getModel(), req.params.id);
      if (!detail) return res.status(404).json({ error: 'Visitor not found' });
      return res.json(detail);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

/**
 * Optional HTTP Basic protection for the dashboard: enabled only when
 * DASHBOARD_PASSWORD is set (any username). The public demo leaves it unset.
 */
function dashboardAuth(password) {
  return (req, res, next) => {
    if (!password) return next();
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    const supplied = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':') : null;
    if (supplied === password) return next();
    res.set('WWW-Authenticate', 'Basic realm="Dashboard"');
    return res.status(401).send('Authentication required');
  };
}

module.exports = { createDashboardRouter, dashboardAuth };
