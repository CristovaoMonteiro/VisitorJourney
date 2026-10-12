/**
 * Seeds MongoDB with a deterministic demo dataset (~300 visitors, the dashboard's last 30 days).
 *
 * Usage:
 *   npm run seed                          # replace previously seeded visitors, keep real ones
 *   npm run seed -- --anchor 2026-10-11   # byte-identical dataset for a fixed day
 *   npm run seed -- --visitors 500 --seed 42
 *   npm run seed -- --reset               # wipe ALL events first (including real visitors)
 */
require('dotenv').config({ quiet: true });

const { connectDB, disconnectDB } = require('../server/db');
const Event = require('../server/models/Event');
const { validateEvent } = require('../server/events/validateEvent');
const { segmentVisitor } = require('../server/segmentation/segmentation');
const { generateDataset, DEFAULT_SEED, DEFAULT_VISITORS, WINDOW_DAYS } = require('./seed/generate');

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseArgs(argv) {
  const args = { seed: DEFAULT_SEED, visitors: DEFAULT_VISITORS, anchor: undefined, reset: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--reset') args.reset = true;
    else if (flag === '--seed') args.seed = Number(argv[(i += 1)]);
    else if (flag === '--visitors') args.visitors = Number(argv[(i += 1)]);
    else if (flag === '--anchor') args.anchor = argv[(i += 1)];
    else throw new Error(`Unknown option: ${flag}`);
  }
  if (!Number.isInteger(args.seed)) throw new Error('--seed must be an integer');
  if (!Number.isInteger(args.visitors) || args.visitors < 1 || args.visitors > 5000) {
    throw new Error('--visitors must be an integer between 1 and 5000');
  }
  if (args.anchor !== undefined && !DAY_RE.test(args.anchor)) throw new Error('--anchor must be YYYY-MM-DD');
  return args;
}

/** Every generated event must pass the same validation as the public API. */
function assertValid(events) {
  for (const event of events) {
    // `now` = the event's own time: checks the schema strictly, skips the "too old" ingest rule.
    const result = validateEvent(
      { ...event, timestamp: event.timestamp.toISOString() },
      { now: new Date(event.timestamp.getTime() + 1000) },
    );
    if (!result.ok) throw new Error(`Generated an invalid ${event.type} event: ${result.errors.join('; ')}`);
  }
}

/** Persona (how the visitor was simulated) x segment (what the rules concluded). */
function segmentReport(dataset) {
  const byVisitor = new Map(dataset.visitors.map((v) => [v.id, []]));
  dataset.events.forEach((e) => byVisitor.get(e.visitorId).push(e));
  const now = new Date();
  const matrix = {};
  dataset.visitors.forEach(({ id, persona }) => {
    const { segment } = segmentVisitor(byVisitor.get(id), { now });
    matrix[persona] ??= {};
    matrix[persona][segment] = (matrix[persona][segment] ?? 0) + 1;
  });
  return matrix;
}

/**
 * Generates and stores the dataset. Exported so `npm run dev:memory` can seed too.
 * Assumes a MongoDB connection is already open.
 */
async function seed({
  seed: seedValue = DEFAULT_SEED,
  visitors = DEFAULT_VISITORS,
  anchor,
  reset = false,
  log = console.log,
} = {}) {
  const dataset = generateDataset({ seed: seedValue, visitors, ...(anchor ? { anchorDay: anchor } : {}) });
  assertValid(dataset.events);

  if (reset) {
    const { deletedCount } = await Event.deleteMany({});
    log(`--reset: removed all ${deletedCount} existing events`);
  } else {
    // Seeded visitor IDs are deterministic, so only previous seed data is replaced.
    const { deletedCount } = await Event.deleteMany({
      visitorId: { $in: dataset.visitors.map((v) => v.id) },
    });
    if (deletedCount) log(`Replaced ${deletedCount} events from a previous seed (real visitors kept)`);
  }

  // receivedAt = timestamp, so the 13-month TTL counts from when the event "happened".
  const docs = dataset.events.map((e) => ({ ...e, receivedAt: e.timestamp }));
  for (let i = 0; i < docs.length; i += 1000) {
    await Event.insertMany(docs.slice(i, i + 1000), { ordered: false });
  }

  const sessions = new Set(dataset.events.map((e) => e.sessionId)).size;
  const purchases = dataset.events.filter((e) => e.type === 'purchase').length;
  log(
    `Seeded ${dataset.visitors.length} visitors, ${sessions} sessions, ${dataset.events.length} events ` +
      `(${purchases} orders) over the ${WINDOW_DAYS} days before ${dataset.anchorDay} - seed ${seedValue}`,
  );
  return { dataset, sessions, purchases };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Add it to .env (see .env.example), or use `npm run dev:memory`.');
    process.exit(1);
  }
  await connectDB(uri);
  try {
    const { dataset } = await seed(args);
    console.log('\nPersona (simulated) → segment (computed by the rules):');
    console.table(segmentReport(dataset));
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { seed, segmentReport, parseArgs };
