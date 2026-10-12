const { segmentVisitor, extractSignals, intentScore } = require('../server/segmentation/segmentation');
const baseConfig = require('../server/segmentation/segmentation.config');

const NOW = new Date('2026-10-11T12:00:00Z');
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

let seq = 0;
/** Builds a stored-event-like object relative to NOW. */
function ev(type, properties = {}, { minutesAgo = 0, daysAgo = 0, at, session = 's1', utm = {} } = {}) {
  seq += 1;
  return {
    eventId: `e${seq}`,
    visitorId: 'v1',
    sessionId: session,
    type,
    timestamp: at ? new Date(at) : new Date(NOW.getTime() - daysAgo * DAY - minutesAgo * MINUTE),
    page: '/',
    referrer: null,
    utm_source: utm.source ?? null,
    utm_medium: utm.medium ?? null,
    utm_campaign: utm.campaign ?? null,
    device: 'desktop',
    properties,
  };
}

const product = (productId, onSale = false) => ({ productId, category: 'shirts', price: 59, onSale });
const view = (id, opts, onSale) => ev('view_product', product(id, onSale), opts);
const analyse = (events, options) => segmentVisitor(events, { now: NOW, ...options });

describe('segment rules', () => {
  test('Curious: one page, a few seconds, no interaction', () => {
    const result = analyse([
      ev('page_view', { pageType: 'home' }),
      ev('scroll_depth', { depth: 25 }, { minutesAgo: -0.2 }),
    ]);
    expect(result.segment).toBe('curious');
    expect(result.explanation.en).toBe(
      'Classified as Curious: saw a single page, stayed 12 s and did not interact.',
    );
  });

  test('Curious is broken by any interaction', () => {
    const result = analyse([
      ev('page_view', { pageType: 'home' }),
      ev('click_cta', { cta: 'hero_collection' }),
    ]);
    expect(result.segment).not.toBe('curious');
  });

  test('Curious is broken by a long stay on the single page', () => {
    const result = analyse([
      ev('page_view', { pageType: 'home' }, { minutesAgo: 2 }),
      ev('scroll_depth', { depth: 75 }),
    ]);
    expect(result.segment).toBe('explorer');
  });

  test('Explorer is the fallback when no rule matches', () => {
    const events = ['home', 'collection', 'other', 'collection'].map((pageType, i) =>
      ev('page_view', { pageType }, { minutesAgo: 10 - i }),
    );
    const result = analyse(events);
    expect(result.segment).toBe('explorer');
    expect(result.tags).toEqual([]);
    expect(result.explanation.pt).toBe(
      'Classificado como Explorador: viu 4 páginas e sem um padrão claro de compra ou comparação.',
    );
  });

  test('Comparer: several products plus filters and size guide (PT explanation)', () => {
    const events = [
      ...['p01', 'p02', 'p03', 'p04', 'p05', 'p06'].map((id, i) => view(id, { minutesAgo: 30 - i })),
      ev('apply_filter', { filter: 'category', value: 'shirts' }, { minutesAgo: 31 }),
      ev('view_size_guide', { productId: 'p01', category: 'shirts' }, { minutesAgo: 20 }),
      ev('view_size_guide', { productId: 'p02', category: 'shirts' }, { minutesAgo: 19 }),
    ];
    const result = analyse(events);
    expect(result.segment).toBe('comparer');
    expect(result.explanation.pt).toBe(
      'Classificado como Comparador: viu 6 produtos, usou filtros 1 vez e abriu o guia de tamanhos 2 vezes.',
    );
  });

  test('Comparer needs at least two comparison signals', () => {
    const events = [
      ...['p01', 'p02', 'p03', 'p04'].map((id, i) => view(id, { minutesAgo: 10 - i })),
      ev('apply_filter', { filter: 'price', value: '0-75' }),
    ];
    expect(analyse(events).segment).toBe('explorer');
  });

  test('Comparer can be triggered by revisiting a product already seen', () => {
    const events = [
      view('p01', { minutesAgo: 9 }),
      view('p02', { minutesAgo: 8 }),
      view('p03', { minutesAgo: 7 }),
      view('p01', { minutesAgo: 6 }),
      ev('view_size_guide', { productId: 'p01', category: 'shirts' }, { minutesAgo: 5 }),
    ];
    const result = analyse(events);
    expect(result.segment).toBe('comparer');
    expect(result.reasons).toContainEqual({ code: 'revisited_products', n: 1 });
  });

  test('Ready to buy: added to bag', () => {
    const result = analyse([view('p03'), ev('add_to_cart', { ...product('p03'), size: 'M', qty: 1 })]);
    expect(result.segment).toBe('ready_to_buy');
    expect(result.explanation.en).toBe('Classified as Ready to buy: added 1 item to the bag.');
  });

  test('Ready to buy: checkout started even without an add_to_cart in this history', () => {
    const result = analyse([ev('checkout_start', { itemCount: 2, value: 150 })]);
    expect(result.segment).toBe('ready_to_buy');
  });

  test('Priority: a comparer who adds to the bag is Ready to buy, tagged Comparer', () => {
    const events = [
      ...['p01', 'p02', 'p03'].map((id, i) => view(id, { minutesAgo: 10 - i })),
      ev('apply_filter', { filter: 'sale', value: 'true' }, { minutesAgo: 11 }),
      ev('view_size_guide', { productId: 'p01', category: 'shirts' }, { minutesAgo: 6 }),
      ev('add_to_cart', { ...product('p01'), size: 'L', qty: 1 }),
    ];
    const result = analyse(events);
    expect(result.segment).toBe('ready_to_buy');
    expect(result.tags).toEqual(['comparer']);
  });

  test('Returning: activity on two different days', () => {
    const result = analyse([
      ev('page_view', { pageType: 'home' }, { daysAgo: 3, session: 'a' }),
      ev('page_view', { pageType: 'collection' }, { session: 'b' }),
    ]);
    expect(result.segment).toBe('returning');
    expect(result.explanation.en).toBe(
      'Classified as Returning: was active on 2 different days and across 2 sessions.',
    );
  });

  test('Two sessions on the same day are not "Returning"', () => {
    const result = analyse([
      ev('page_view', { pageType: 'home' }, { minutesAgo: 120, session: 'a' }),
      ev('page_view', { pageType: 'home' }, { session: 'b' }),
    ]);
    expect(result.segment).not.toBe('returning');
  });

  test('Calendar days follow the configured time zone (Lisbon), not UTC', () => {
    // 22:30 and 23:30 UTC are the same UTC day, but 23:30 and 00:30 in Lisbon (UTC+1 in October).
    const events = [
      ev('page_view', { pageType: 'home' }, { at: '2026-10-10T22:30:00Z', session: 'a' }),
      ev('page_view', { pageType: 'home' }, { at: '2026-10-10T23:30:00Z', session: 'b' }),
    ];
    expect(analyse(events).segment).toBe('returning');
    expect(analyse(events, { config: { ...baseConfig, timeZone: 'UTC' } }).segment).not.toBe('returning');
  });

  test('Deal hunter: newsletter entry and mostly discounted products', () => {
    const utm = { source: 'newsletter', medium: 'email', campaign: 'autumn-edit' };
    const events = [
      ev('page_view', { pageType: 'collection' }, { minutesAgo: 5, utm }),
      view('p02', { minutesAgo: 4, utm }, true),
      view('p06', { minutesAgo: 3, utm }, true),
      view('p01', { minutesAgo: 2, utm }, false),
    ];
    const result = analyse(events);
    expect(result.segment).toBe('deal_hunter');
    expect(result.explanation.en).toBe(
      'Classified as Deal hunter: arrived through the "autumn-edit" campaign and 67% of the products viewed were on sale (2 of 3).',
    );
  });

  test('Deal hunter requires a promotional entry', () => {
    const events = [view('p02', {}, true), view('p06', {}, true)];
    expect(analyse(events).segment).not.toBe('deal_hunter');
  });

  test('Deal hunter requires focus on discounted products', () => {
    const utm = { source: 'newsletter', medium: 'email' };
    const events = [view('p02', { utm }, true), view('p01', { utm }), view('p03', { utm })];
    expect(analyse(events).segment).not.toBe('deal_hunter');
  });

  test('A sale keyword in the campaign counts as a promotional entry', () => {
    const utm = { source: 'instagram', medium: 'paid_social', campaign: 'winter-sale' };
    expect(extractSignals([view('p02', { utm }, true)]).promoEntry).toEqual({
      source: 'instagram',
      medium: 'paid_social',
      campaign: 'winter-sale',
    });
  });

  test('Thresholds come from the config and can be tuned', () => {
    const events = [
      view('p01', { minutesAgo: 3 }),
      view('p02', { minutesAgo: 2 }),
      ev('apply_filter', { filter: 'sort', value: 'price-asc' }),
      ev('view_size_guide', { productId: 'p01', category: 'shirts' }),
    ];
    expect(analyse(events).segment).toBe('explorer');
    const loose = {
      ...baseConfig,
      segments: { ...baseConfig.segments, comparer: { minDistinctProducts: 2, minComparisonSignals: 2 } },
    };
    expect(analyse(events, { config: loose }).segment).toBe('comparer');
  });

  test('Event order does not change the result', () => {
    const events = [
      ev('page_view', { pageType: 'home' }, { daysAgo: 2, session: 'a' }),
      view('p03', { session: 'b', minutesAgo: 2 }),
      ev('add_to_cart', { ...product('p03'), size: 'S', qty: 1 }, { session: 'b' }),
    ];
    const shuffled = [events[2], events[0], events[1]];
    expect(analyse(shuffled)).toEqual(analyse(events));
  });
});

describe('intent score', () => {
  const score = (events) => intentScore(events, { now: NOW }).score;

  test('no events means no intent', () => {
    expect(score([])).toBe(0);
  });

  test('recent events count fully, week-old events count half', () => {
    const addToCart = (daysAgo) => ev('add_to_cart', { ...product('p01'), size: 'M', qty: 1 }, { daysAgo });
    expect(score([addToCart(0)])).toBe(12);
    expect(score([addToCart(7)])).toBe(6);
  });

  test('passive browsing is capped so it cannot dominate', () => {
    const views = Array.from({ length: 50 }, () => ev('page_view', { pageType: 'collection' }));
    expect(score(views)).toBe(baseConfig.score.caps.page_view);
  });

  test('the score never exceeds 100', () => {
    const buys = Array.from({ length: 10 }, () =>
      ev('purchase', {
        orderRef: 'ORL-ABCDEF',
        itemCount: 1,
        value: 59,
        shipping: 6.95,
        delivery: 'standard',
      }),
    );
    expect(score(buys)).toBe(100);
  });

  test('second thoughts lower the score but never below zero', () => {
    const add = ev('add_to_cart', { ...product('p01'), size: 'M', qty: 1 });
    const remove = ev('remove_from_cart', { ...product('p01'), size: 'M', qty: 1 });
    expect(score([add, remove])).toBe(8);
    expect(score([remove, remove, remove])).toBe(0);
  });

  test('the breakdown explains where the points come from', () => {
    const { breakdown } = intentScore(
      [view('p01'), view('p02'), ev('checkout_start', { itemCount: 1, value: 59 })],
      { now: NOW },
    );
    expect(breakdown).toEqual({ view_product: 6, checkout_start: 20 });
  });
});
