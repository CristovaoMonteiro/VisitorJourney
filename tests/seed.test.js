const { generateDataset } = require('../scripts/seed/generate');
const { createRandom } = require('../scripts/seed/random');
const { segmentReport } = require('../scripts/seed');
const { validateEvent } = require('../server/events/validateEvent');
const { startOfDay } = require('../server/dashboard/analytics');

const ANCHOR = '2026-10-11';
const dataset = generateDataset({ anchorDay: ANCHOR });

describe('seeded random generator', () => {
  test('the same seed yields the same sequence', () => {
    const a = createRandom(7);
    const b = createRandom(7);
    expect(Array.from({ length: 5 }, a.next)).toEqual(Array.from({ length: 5 }, b.next));
  });

  test('uuid() produces valid v4-shaped ids', () => {
    expect(createRandom(1).uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('demo dataset', () => {
  test('is fully deterministic for a fixed seed and anchor', () => {
    expect(JSON.stringify(generateDataset({ anchorDay: ANCHOR }))).toBe(JSON.stringify(dataset));
  });

  test('keeps the same visitors when only the anchor day changes', () => {
    const later = generateDataset({ anchorDay: '2026-12-01' });
    expect(later.visitors).toEqual(dataset.visitors);
    expect(later.events.length).toBe(dataset.events.length);
  });

  test('a different seed gives a different dataset', () => {
    expect(generateDataset({ anchorDay: ANCHOR, seed: 1 }).visitors[0].id).not.toBe(dataset.visitors[0].id);
  });

  test('creates ~300 visitors with the configured persona mix', () => {
    const counts = {};
    dataset.visitors.forEach((v) => {
      counts[v.persona] = (counts[v.persona] ?? 0) + 1;
    });
    expect(dataset.visitors).toHaveLength(300);
    expect(counts).toEqual({
      curious: 90,
      explorer: 45,
      comparer: 54,
      ready_to_buy: 45,
      deal_hunter: 30,
      returning: 36,
    });
  });

  test('places every event in the 29 days before the anchor day', () => {
    const start = startOfDay('2026-09-12');
    const end = startOfDay(ANCHOR) + 3 * 60 * 60 * 1000; // a late pair may end in the small hours
    dataset.events.forEach((e) => {
      expect(e.timestamp.getTime()).toBeGreaterThanOrEqual(start);
      expect(e.timestamp.getTime()).toBeLessThan(end);
    });
  });

  test('every event passes the public API validation', () => {
    const invalid = dataset.events
      .map((e) =>
        validateEvent(
          { ...e, timestamp: e.timestamp.toISOString() },
          { now: new Date(e.timestamp.getTime() + 1000) },
        ),
      )
      .filter((r) => !r.ok);
    expect(invalid).toEqual([]);
  });

  test('event and session ids are unique', () => {
    expect(new Set(dataset.events.map((e) => e.eventId)).size).toBe(dataset.events.length);
  });

  test('conversion looks like real e-commerce (purchase rate per session 2-8%)', () => {
    const sessions = new Set(dataset.events.map((e) => e.sessionId)).size;
    const purchases = dataset.events.filter((e) => e.type === 'purchase').length;
    expect(purchases / sessions).toBeGreaterThan(0.02);
    expect(purchases / sessions).toBeLessThan(0.08);
  });

  test('the segmentation rules recover most simulated personas', () => {
    const matrix = segmentReport(dataset);
    const agree = (persona) =>
      (matrix[persona][persona] ?? 0) / Object.values(matrix[persona]).reduce((a, b) => a + b, 0);
    expect(agree('curious')).toBe(1);
    expect(agree('ready_to_buy')).toBe(1);
    expect(agree('comparer')).toBeGreaterThan(0.85);
    expect(agree('returning')).toBeGreaterThan(0.8);
    // Deal hunters who add to the bag are, by priority, "Ready to buy".
    expect(agree('deal_hunter') + (matrix.deal_hunter.ready_to_buy ?? 0) / 30).toBe(1);
  });
});
