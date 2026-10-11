/**
 * Dashboard analytics: turns raw events into sessions and visitors, then
 * answers the dashboard's questions (KPIs, funnel, segments, visitor list,
 * visitor journey). Pure functions, no database access.
 *
 * Units (see README): rates and the funnel are per SESSION; the segment
 * distribution and the visitor list are per VISITOR. A visitor's segment is
 * computed on their full history; the date range scopes which sessions count.
 */
const { segmentVisitor } = require('../segmentation/segmentation');
const segmentationConfig = require('../segmentation/segmentation.config');

const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = segmentationConfig.timeZone;
const SEGMENTS = [...segmentationConfig.priority, segmentationConfig.fallback];

/** "Reached" funnel: each step counts sessions containing that event, regardless of order. */
const FUNNEL_STEPS = [
  { key: 'visit', type: null },
  { key: 'product', type: 'view_product' },
  { key: 'cart', type: 'add_to_cart' },
  { key: 'checkout', type: 'checkout_start' },
  { key: 'purchase', type: 'purchase' },
];

const toMs = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());

// ---------------------------------------------------------------------------
// Time-zone helpers (calendar days are the store's days, not UTC days)
// ---------------------------------------------------------------------------
function dayKey(ms, timeZone = TIME_ZONE) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone });
}

/** Offset of `timeZone` from UTC at instant `ms`, in milliseconds. */
function zoneOffsetMs(ms, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** UTC instant of 00:00 on calendar day `YYYY-MM-DD` in `timeZone`. */
function startOfDay(day, timeZone = TIME_ZONE) {
  const [y, m, d] = day.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return guess - zoneOffsetMs(guess, timeZone);
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

// ---------------------------------------------------------------------------
// Model: sessions and visitors
// ---------------------------------------------------------------------------

/** Acquisition label for a session: UTM source, else referring domain, else "direct". */
function sourceOf(event) {
  return event.utm_source || event.referrer || 'direct';
}

/**
 * Groups events into sessions and visitors and segments every visitor.
 * @param {Array<object>} events all stored events
 * @param {{ now?: Date }} [options]
 */
function buildModel(events, { now = new Date() } = {}) {
  const sorted = [...events].sort((a, b) => toMs(a.timestamp) - toMs(b.timestamp));
  const sessions = new Map();
  const visitorEvents = new Map();
  const visitorSessions = new Map();

  for (const event of sorted) {
    const time = toMs(event.timestamp);
    let session = sessions.get(event.sessionId);
    if (!session) {
      // Acquisition and device are taken from the session's first event.
      session = {
        id: event.sessionId,
        visitorId: event.visitorId,
        start: time,
        end: time,
        device: event.device,
        source: sourceOf(event),
        utm: { source: event.utm_source, medium: event.utm_medium, campaign: event.utm_campaign },
        referrer: event.referrer,
        types: new Set(),
        eventCount: 0,
      };
      sessions.set(event.sessionId, session);
      if (!visitorSessions.has(event.visitorId)) visitorSessions.set(event.visitorId, []);
      visitorSessions.get(event.visitorId).push(session);
    }
    session.end = time;
    session.types.add(event.type);
    session.eventCount += 1;

    if (!visitorEvents.has(event.visitorId)) visitorEvents.set(event.visitorId, []);
    visitorEvents.get(event.visitorId).push(event);
  }

  const visitors = new Map();
  for (const [id, list] of visitorEvents) {
    visitors.set(id, {
      id,
      events: list,
      sessions: visitorSessions.get(id),
      firstSeen: toMs(list[0].timestamp),
      lastSeen: toMs(list[list.length - 1].timestamp),
      segmentation: segmentVisitor(list, { now }),
    });
  }

  return { sessions: [...sessions.values()], visitors, builtAt: now };
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

/**
 * @typedef {{ from: string, to: string, segment?: string, source?: string, device?: string }} Filters
 * `from`/`to` are inclusive calendar days (YYYY-MM-DD) in the store's time zone.
 */
function rangeOf({ from, to }) {
  return { start: startOfDay(from), end: startOfDay(addDays(to, 1)) };
}

function filterSessions(model, filters, { ignore = [] } = {}) {
  const { start, end } = rangeOf(filters);
  const use = (key) => filters[key] && !ignore.includes(key);
  return model.sessions.filter((s) => {
    if (s.start < start || s.start >= end) return false;
    if (use('device') && s.device !== filters.device) return false;
    if (use('source') && s.source !== filters.source) return false;
    if (use('segment') && model.visitors.get(s.visitorId)?.segmentation.segment !== filters.segment) return false;
    return true;
  });
}

const rate = (part, whole) => (whole > 0 ? part / whole : 0);
const countWith = (sessions, type) => sessions.filter((s) => s.types.has(type)).length;

function kpisFor(sessions) {
  return {
    visitors: new Set(sessions.map((s) => s.visitorId)).size,
    sessions: sessions.length,
    addToCartRate: rate(countWith(sessions, 'add_to_cart'), sessions.length),
    purchaseRate: rate(countWith(sessions, 'purchase'), sessions.length),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** KPIs (with the previous period of equal length), funnel, segments, daily sessions, filter options. */
function overview(model, filters) {
  const sessions = filterSessions(model, filters);

  const length = daysBetween(filters.from, filters.to).length;
  const previous = filterSessions(model, {
    ...filters,
    from: addDays(filters.from, -length),
    to: addDays(filters.from, -1),
  });

  const funnel = FUNNEL_STEPS.map((step, i) => ({
    key: step.key,
    sessions: step.type ? countWith(sessions, step.type) : sessions.length,
    index: i,
  })).map((step, i, steps) => ({
    key: step.key,
    sessions: step.sessions,
    ofFirst: rate(step.sessions, steps[0].sessions),
    ofPrevious: i === 0 ? 1 : rate(step.sessions, steps[i - 1].sessions),
  }));

  const visitorIds = new Set(sessions.map((s) => s.visitorId));
  const segmentCounts = Object.fromEntries(SEGMENTS.map((id) => [id, 0]));
  visitorIds.forEach((id) => {
    segmentCounts[model.visitors.get(id).segmentation.segment] += 1;
  });

  const perDay = new Map(daysBetween(filters.from, filters.to).map((d) => [d, 0]));
  sessions.forEach((s) => {
    const key = dayKey(s.start);
    if (perDay.has(key)) perDay.set(key, perDay.get(key) + 1);
  });

  // Options ignore their own filter, so choosing one value never hides the others.
  const sourceCounts = new Map();
  filterSessions(model, filters, { ignore: ['source'] }).forEach((s) =>
    sourceCounts.set(s.source, (sourceCounts.get(s.source) ?? 0) + 1),
  );

  return {
    filters,
    kpis: kpisFor(sessions),
    previous: kpisFor(previous),
    funnel,
    segments: SEGMENTS.map((id) => ({ segment: id, visitors: segmentCounts[id] })),
    daily: [...perDay].map(([date, count]) => ({ date, sessions: count })),
    options: {
      sources: [...sourceCounts].sort((a, b) => b[1] - a[1]).map(([source]) => source),
      segments: SEGMENTS,
      devices: ['desktop', 'mobile'],
    },
  };
}

const SORTERS = {
  score: (a, b) => a.score - b.score,
  lastActivity: (a, b) => a.lastActivity - b.lastActivity,
  sessions: (a, b) => a.sessions - b.sessions,
  segment: (a, b) => SEGMENTS.indexOf(a.segment) - SEGMENTS.indexOf(b.segment),
  source: (a, b) => a.source.localeCompare(b.source),
};
const SORT_KEYS = Object.keys(SORTERS);

/**
 * Paginated visitor list for the filtered sessions.
 * @param {{ sort?: string, order?: 'asc'|'desc', page?: number, pageSize?: number, q?: string }} [options]
 */
function listVisitors(model, filters, { sort = 'lastActivity', order = 'desc', page = 1, pageSize = 25, q = '' } = {}) {
  const byVisitor = new Map();
  filterSessions(model, filters).forEach((s) => {
    if (!byVisitor.has(s.visitorId)) byVisitor.set(s.visitorId, []);
    byVisitor.get(s.visitorId).push(s);
  });

  let rows = [...byVisitor].map(([id, sessions]) => {
    const visitor = model.visitors.get(id);
    const latest = sessions[sessions.length - 1];
    return {
      id,
      segment: visitor.segmentation.segment,
      tags: visitor.segmentation.tags,
      score: visitor.segmentation.score,
      sessions: sessions.length,
      lastActivity: visitor.lastSeen,
      source: latest.source,
      device: latest.device,
    };
  });

  const query = q.trim().toLowerCase();
  if (query) rows = rows.filter((r) => r.id.startsWith(query));

  const compare = SORTERS[sort] ?? SORTERS.lastActivity;
  rows.sort((a, b) => (order === 'asc' ? 1 : -1) * compare(a, b) || b.lastActivity - a.lastActivity);

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  return {
    total,
    page: current,
    pages,
    pageSize,
    items: rows
      .slice((current - 1) * pageSize, current * pageSize)
      .map((r) => ({ ...r, lastActivity: new Date(r.lastActivity).toISOString() })),
  };
}

/** Full journey of one visitor, grouped by session, plus the segmentation and its explanation. */
function visitorDetail(model, id) {
  const visitor = model.visitors.get(id);
  if (!visitor) return null;
  const { segment, tags, score, scoreBreakdown, signals, explanation, reasons } = visitor.segmentation;
  return {
    id,
    segment,
    tags,
    score,
    scoreBreakdown,
    reasons,
    explanation,
    signals,
    firstSeen: new Date(visitor.firstSeen).toISOString(),
    lastSeen: new Date(visitor.lastSeen).toISOString(),
    sessions: visitor.sessions.map((s) => ({
      id: s.id,
      start: new Date(s.start).toISOString(),
      end: new Date(s.end).toISOString(),
      device: s.device,
      source: s.source,
      utm: s.utm,
      referrer: s.referrer,
      events: visitor.events
        .filter((e) => e.sessionId === s.id)
        .map((e) => ({
          type: e.type,
          timestamp: new Date(toMs(e.timestamp)).toISOString(),
          page: e.page,
          properties: e.properties,
        })),
    })),
  };
}

module.exports = {
  buildModel,
  overview,
  listVisitors,
  visitorDetail,
  filterSessions,
  startOfDay,
  dayKey,
  addDays,
  SEGMENTS,
  SORT_KEYS,
  FUNNEL_STEPS,
};
