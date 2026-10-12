/**
 * Deterministic demo dataset: same seed => same visitors, sessions and events.
 *
 * Dates are laid out relative to an anchor day (default: today), always within
 * the 29 days BEFORE it (plus today = the dashboard's default "last 30 days"), so it is always populated.
 * Every random draw happens regardless of the anchor, so IDs and journeys are
 * identical whichever day the seed runs; only the calendar dates move.
 */
const fs = require('fs');
const path = require('path');

const { createRandom } = require('./random');
const { SessionBuilder } = require('./session');
const { PERSONAS, SOURCES } = require('./personas');
const { startOfDay, addDays, dayKey } = require('../../server/dashboard/analytics');

const DEFAULT_SEED = 20261011;
const DEFAULT_VISITORS = 300;
// 29 full days before the anchor: with today, that is exactly the dashboard's default "last 30 days".
const WINDOW_DAYS = 29;
const HOUR_MS = 60 * 60 * 1000;

// Share of sessions starting at each local hour (Lisbon): lunch and evening peaks.
const HOUR_WEIGHTS = {
  0: 1, 7: 1, 8: 2, 9: 3, 10: 3, 11: 3, 12: 5, 13: 6, 14: 4, 15: 3,
  16: 3, 17: 3, 18: 4, 19: 6, 20: 7, 21: 7, 22: 5, 23: 2,
};
// Weekends are a little busier for fashion e-commerce (0 = Sunday).
const WEEKDAY_WEIGHTS = [1.2, 0.9, 1, 1, 1, 1.05, 1.15];

/** Order-reference prefix from the brand name in the single brand config file. */
function brandCode() {
  try {
    const source = fs.readFileSync(path.join(__dirname, '../../public/js/config.js'), 'utf8');
    const name = source.match(/name:\s*'([^']+)'/)?.[1] ?? 'Orlo';
    return name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'ORL';
  } catch {
    return 'ORL';
  }
}

/** Exact persona counts for N visitors (largest-remainder rounding), in shuffled order. */
function allocatePersonas(rng, total) {
  const entries = Object.entries(PERSONAS).map(([id, p]) => ({ id, exact: p.weight * total }));
  entries.forEach((e) => {
    e.count = Math.floor(e.exact);
  });
  let missing = total - entries.reduce((sum, e) => sum + e.count, 0);
  [...entries]
    .sort((a, b) => (b.exact % 1) - (a.exact % 1))
    .forEach((e) => {
      if (missing > 0) {
        e.count += 1;
        missing -= 1;
      }
    });
  const list = entries.flatMap((e) => Array.from({ length: e.count }, () => e.id));
  return rng.sample(list, list.length);
}

/** Picks how many days before the anchor the first session happens (1-30). */
function pickFirstDay(rng, sourceKey, anchorDay) {
  const send = SOURCES[sourceKey].sendDaysAgo;
  if (send) {
    // Email traffic arrives on the send day or the day after.
    const day = rng.pick(send) - rng.int(0, 1);
    return Math.max(1, day);
  }
  const weights = {};
  for (let daysAgo = 1; daysAgo <= WINDOW_DAYS; daysAgo += 1) {
    const weekday = new Date(`${addDays(anchorDay, -daysAgo)}T12:00:00Z`).getUTCDay();
    // Slight upward trend: recent days get a bit more traffic.
    weights[daysAgo] = WEEKDAY_WEIGHTS[weekday] * (1 + (WINDOW_DAYS - daysAgo) / 60);
  }
  return Number(rng.weighted(weights));
}

function sessionStart(rng, anchorDay, daysAgo) {
  const hour = Number(rng.weighted(HOUR_WEIGHTS));
  const minute = rng.int(0, 59);
  const second = rng.int(0, 59);
  return startOfDay(addDays(anchorDay, -daysAgo)) + hour * HOUR_MS + (minute * 60 + second) * 1000;
}

/**
 * @param {{ seed?: number, visitors?: number, anchorDay?: string }} [options]
 *   anchorDay: YYYY-MM-DD in the store time zone; data covers the 29 days before it.
 * @returns {{ events: object[], visitors: { id: string, persona: string }[], anchorDay: string }}
 */
function generateDataset({ seed = DEFAULT_SEED, visitors = DEFAULT_VISITORS, anchorDay = dayKey(Date.now()) } = {}) {
  const rng = createRandom(seed);
  const code = brandCode();
  const events = [];
  const roster = [];

  for (const personaId of allocatePersonas(rng, visitors)) {
    const persona = PERSONAS[personaId];
    const visitorId = rng.uuid();
    const device = rng.chance(persona.mobile) ? 'mobile' : 'desktop';
    const baseSource = rng.weighted(persona.sources);
    const plans = persona.sessions(rng);
    roster.push({ id: visitorId, persona: personaId });

    // Lay sessions out on the calendar: gaps first, then a first day with room for all of them.
    const gaps = plans.map((plan, i) => (i > 0 ? rng.int(...plan.gapDays) : 0));
    const span = gaps.reduce((sum, gap) => sum + gap, 0);
    const minFirst = Math.min(WINDOW_DAYS, 1 + span);
    let first = pickFirstDay(rng, baseSource, anchorDay);
    // Too recent to fit every return visit: mirror it back into the window rather than
    // clamping, so multi-session visitors don't all pile up on "yesterday".
    if (first < minFirst) first = Math.min(WINDOW_DAYS, minFirst + (minFirst - first));
    let daysAgo = first;
    const days = gaps.map((gap) => {
      daysAgo = Math.max(1, daysAgo - gap);
      return daysAgo;
    });

    const memory = {};
    let previousEnd = -Infinity;
    plans.forEach((plan, sessionIndex) => {
      const sourceKey =
        sessionIndex === 0 ? baseSource : plan.source ? rng.pick(plan.source) : rng.chance(0.6) ? baseSource : 'direct';
      let start = sessionStart(rng, anchorDay, days[sessionIndex]);
      // Two sessions on the same day must be separated by more than the 30-minute timeout.
      // The short gap keeps even a late-evening pair from spilling far into the anchor day.
      if (start <= previousEnd + 31 * 60 * 1000) start = previousEnd + rng.int(40, 90) * 60 * 1000;

      const session = new SessionBuilder({ rng, visitorId, start, source: SOURCES[sourceKey], device, out: events });
      session.brandCode = code;
      persona.journey(session, rng, { plan, sessionIndex, memory });
      previousEnd = session.end();
    });
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return { events, visitors: roster, anchorDay };
}

module.exports = { generateDataset, DEFAULT_SEED, DEFAULT_VISITORS, WINDOW_DAYS };
