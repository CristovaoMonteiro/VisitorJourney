const { buildModel, overview, listVisitors, visitorDetail, startOfDay } = require('../server/dashboard/analytics');

const NOW = new Date('2026-10-11T12:00:00Z');
let seq = 0;

/** Minimal stored-event builder. `at` is an ISO instant. */
function ev(visitorId, sessionId, type, at, extra = {}) {
  seq += 1;
  return {
    eventId: `e${seq}`,
    visitorId,
    sessionId,
    type,
    timestamp: new Date(at),
    page: '/',
    referrer: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    device: 'desktop',
    properties: {},
    ...extra,
  };
}

const product = { productId: 'p01', category: 'shirts', price: 79, onSale: false };

// v1: buyer from the newsletter (mobile); v2: browser (direct); v3: curious, outside the range.
const events = [
  ev('v1', 's1', 'page_view', '2026-10-10T10:00:00Z', { utm_source: 'newsletter', utm_medium: 'email', device: 'mobile' }),
  ev('v1', 's1', 'view_product', '2026-10-10T10:01:00Z', { properties: product, utm_source: 'newsletter', device: 'mobile' }),
  ev('v1', 's1', 'add_to_cart', '2026-10-10T10:02:00Z', { properties: { ...product, size: 'M', qty: 1 }, device: 'mobile' }),
  ev('v1', 's1', 'checkout_start', '2026-10-10T10:03:00Z', { properties: { itemCount: 1, value: 85.95 }, device: 'mobile' }),
  ev('v1', 's1', 'purchase', '2026-10-10T10:04:00Z', { properties: { orderRef: 'ORL-AAAA', itemCount: 1, value: 85.95, shipping: 6.95, delivery: 'standard' }, device: 'mobile' }),
  ev('v2', 's2', 'page_view', '2026-10-09T15:00:00Z'),
  ev('v2', 's2', 'view_product', '2026-10-09T15:01:00Z', { properties: product }),
  ev('v2', 's3', 'page_view', '2026-10-11T09:00:00Z'),
  ev('v3', 's4', 'page_view', '2026-09-01T09:00:00Z'),
];

const model = buildModel(events, { now: NOW });
const range = { from: '2026-10-05', to: '2026-10-11' };

describe('dashboard analytics', () => {
  test('KPIs are per session and only count sessions that start in the range', () => {
    const { kpis } = overview(model, range);
    expect(kpis).toEqual({ visitors: 2, sessions: 3, addToCartRate: 1 / 3, purchaseRate: 1 / 3 });
  });

  test('the funnel counts sessions that reached each step', () => {
    const { funnel } = overview(model, range);
    expect(funnel.map((s) => [s.key, s.sessions])).toEqual([
      ['visit', 3],
      ['product', 2],
      ['cart', 1],
      ['checkout', 1],
      ['purchase', 1],
    ]);
    expect(funnel[1].ofPrevious).toBeCloseTo(2 / 3);
  });

  test('filters by acquisition source and device scope every number', () => {
    expect(overview(model, { ...range, source: 'newsletter' }).kpis.sessions).toBe(1);
    expect(overview(model, { ...range, device: 'desktop' }).kpis.visitors).toBe(1);
    expect(overview(model, { ...range, source: 'direct' }).kpis.sessions).toBe(2);
  });

  test('the segment filter uses each visitor\'s primary segment', () => {
    const buyers = overview(model, { ...range, segment: 'ready_to_buy' });
    expect(buyers.kpis.visitors).toBe(1);
    const counts = Object.fromEntries(overview(model, range).segments.map((s) => [s.segment, s.visitors]));
    expect(counts.ready_to_buy).toBe(1);
    expect(counts.returning).toBe(1);
  });

  test('source options are listed even when a source filter is active', () => {
    expect(overview(model, { ...range, source: 'newsletter' }).options.sources.sort()).toEqual(['direct', 'newsletter']);
  });

  test('daily series covers every day of the range in the store time zone', () => {
    const { daily } = overview(model, range);
    expect(daily).toHaveLength(7);
    expect(daily.find((p) => p.date === '2026-10-10').sessions).toBe(1);
  });

  test('the previous period has the same length and ends the day before the range', () => {
    const { previous } = overview(model, { from: '2026-10-10', to: '2026-10-11' });
    expect(previous.sessions).toBe(1); // v2 on 2026-10-09
  });

  test('visitor list sorts by score and paginates', () => {
    const list = listVisitors(model, range, { sort: 'score', order: 'desc', pageSize: 1 });
    expect(list.total).toBe(2);
    expect(list.pages).toBe(2);
    expect(list.items[0].id).toBe('v1');
  });

  test('visitor detail groups the journey by session with an explanation', () => {
    const detail = visitorDetail(model, 'v2');
    expect(detail.sessions.map((s) => s.events.length)).toEqual([2, 1]);
    expect(detail.explanation.en).toMatch(/^Classified as Returning/);
    expect(visitorDetail(model, 'nope')).toBeNull();
  });

  test('calendar days start at midnight Lisbon time', () => {
    // Lisbon is UTC+1 in October.
    expect(new Date(startOfDay('2026-10-11')).toISOString()).toBe('2026-10-10T23:00:00.000Z');
    expect(new Date(startOfDay('2026-01-15')).toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});
