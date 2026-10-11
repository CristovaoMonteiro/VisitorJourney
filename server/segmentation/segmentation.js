/**
 * Visitor segmentation and intent score.
 *
 * Pure functions only: give them a visitor's events (as stored by the API)
 * and a reference time, get back a segment, tags, a 0-100 intent score and a
 * human explanation. No database access, so the rules are easy to test and
 * are reused by the seed script and the dashboard API.
 *
 *   events ──▶ extractSignals ──▶ classify ──▶ explain
 *          └─────────────────────▶ intentScore
 */
const DEFAULT_CONFIG = require('./segmentation.config');

const DAY_MS = 24 * 60 * 60 * 1000;
const PASSIVE_TYPES = new Set(['page_view', 'scroll_depth']);

const SEGMENT_LABELS = {
  ready_to_buy: { en: 'Ready to buy', pt: 'Pronto a comprar' },
  deal_hunter: { en: 'Deal hunter', pt: 'Caçador de ofertas' },
  comparer: { en: 'Comparer', pt: 'Comparador' },
  returning: { en: 'Returning', pt: 'Regressado' },
  curious: { en: 'Curious', pt: 'Curioso' },
  explorer: { en: 'Explorer', pt: 'Explorador' },
};

const toTime = (value) => (value instanceof Date ? value.getTime() : new Date(value).getTime());

function dayKey(time, timeZone) {
  // en-CA formats as YYYY-MM-DD, convenient as a calendar-day key.
  return new Date(time).toLocaleDateString('en-CA', { timeZone });
}

/** True when the event's acquisition fields look like a promotion or newsletter. */
function isPromoEntry(event, promo) {
  const medium = event.utm_medium ?? '';
  const source = event.utm_source ?? '';
  const campaign = event.utm_campaign ?? '';
  return (
    promo.mediums.includes(medium) ||
    promo.sources.includes(source) ||
    promo.campaignKeywords.some((keyword) => campaign.includes(keyword))
  );
}

// ---------------------------------------------------------------------------
// 1. Signals: everything the rules need, computed in one pass
// ---------------------------------------------------------------------------

/**
 * @param {Array<object>} events one visitor's events, in any order
 * @param {{ config?: object }} [options]
 */
function extractSignals(events, { config = DEFAULT_CONFIG } = {}) {
  const sorted = [...events].sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp));
  const count = (type) => sorted.filter((e) => e.type === type).length;

  const sessions = new Map();
  const days = new Set();
  const productViewCounts = new Map();
  let saleProductViews = 0;
  let promoEvent = null;

  for (const event of sorted) {
    const time = toTime(event.timestamp);
    days.add(dayKey(time, config.timeZone));

    const session = sessions.get(event.sessionId) ?? { start: time, end: time };
    session.end = time;
    sessions.set(event.sessionId, session);

    if (event.type === 'view_product') {
      const id = event.properties?.productId;
      productViewCounts.set(id, (productViewCounts.get(id) ?? 0) + 1);
      if (event.properties?.onSale) saleProductViews += 1;
    }
    if (!promoEvent && isPromoEntry(event, config.promo)) promoEvent = event;
  }

  const productViews = count('view_product');
  const sessionDurations = [...sessions.values()].map((s) => (s.end - s.start) / 1000);

  return {
    eventCount: sorted.length,
    firstSeen: sorted[0] ? new Date(toTime(sorted[0].timestamp)) : null,
    lastSeen: sorted.length ? new Date(toTime(sorted[sorted.length - 1].timestamp)) : null,
    sessions: sessions.size,
    activeDays: days.size,
    longestSessionSeconds: Math.round(Math.max(0, ...sessionDurations)),
    pageViews: count('page_view'),
    interactions: sorted.filter((e) => !PASSIVE_TYPES.has(e.type)).length,
    productViews,
    distinctProducts: productViewCounts.size,
    revisitedProducts: [...productViewCounts.values()].filter((n) => n > 1).length,
    saleProductViews,
    saleShare: productViews > 0 ? saleProductViews / productViews : 0,
    filtersApplied: count('apply_filter'),
    sizeGuideViews: count('view_size_guide'),
    addToCart: count('add_to_cart'),
    removeFromCart: count('remove_from_cart'),
    checkoutStarts: count('checkout_start'),
    purchases: count('purchase'),
    newsletterSignups: count('newsletter_signup'),
    promoEntry: promoEvent
      ? {
          source: promoEvent.utm_source ?? null,
          medium: promoEvent.utm_medium ?? null,
          campaign: promoEvent.utm_campaign ?? null,
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// 2. Rules: each returns the reasons it matched, or null
// ---------------------------------------------------------------------------

const RULES = {
  ready_to_buy(s, c) {
    const matches = s.addToCart >= c.minAddToCart || s.checkoutStarts >= c.minCheckoutStarts;
    if (!matches) return null;
    const reasons = [];
    if (s.addToCart > 0) reasons.push({ code: 'added_to_cart', n: s.addToCart });
    if (s.checkoutStarts > 0) reasons.push({ code: 'started_checkout', n: s.checkoutStarts });
    if (s.purchases > 0) reasons.push({ code: 'purchased', n: s.purchases });
    return reasons;
  },

  deal_hunter(s, c) {
    const matches = s.promoEntry && s.productViews >= c.minProductViews && s.saleShare >= c.minSaleShare;
    if (!matches) return null;
    return [
      { code: 'promo_entry', ...s.promoEntry },
      { code: 'sale_share', pct: Math.round(s.saleShare * 100), n: s.saleProductViews, total: s.productViews },
    ];
  },

  comparer(s, c) {
    const signals = [
      s.filtersApplied > 0 && { code: 'used_filters', n: s.filtersApplied },
      s.sizeGuideViews > 0 && { code: 'opened_size_guide', n: s.sizeGuideViews },
      s.revisitedProducts > 0 && { code: 'revisited_products', n: s.revisitedProducts },
    ].filter(Boolean);
    if (s.distinctProducts < c.minDistinctProducts || signals.length < c.minComparisonSignals) return null;
    return [{ code: 'viewed_products', n: s.distinctProducts }, ...signals];
  },

  returning(s, c) {
    if (s.activeDays < c.minActiveDays) return null;
    return [
      { code: 'active_days', n: s.activeDays },
      { code: 'sessions', n: s.sessions },
    ];
  },

  curious(s, c) {
    const matches =
      s.eventCount > 0 &&
      s.sessions <= c.maxSessions &&
      s.pageViews <= c.maxPageViews &&
      s.longestSessionSeconds < c.maxSessionSeconds &&
      s.interactions <= c.maxInteractions;
    if (!matches) return null;
    return [{ code: 'single_page' }, { code: 'short_visit', seconds: s.longestSessionSeconds }, { code: 'no_interaction' }];
  },
};

/**
 * Applies every rule; the highest-priority match is the primary segment,
 * the remaining matches become tags.
 */
function classify(signals, { config = DEFAULT_CONFIG } = {}) {
  const matched = config.priority
    .map((id) => ({ id, reasons: RULES[id](signals, config.segments[id]) }))
    .filter((m) => m.reasons);

  if (matched.length === 0) {
    return {
      segment: config.fallback,
      tags: [],
      reasons: [
        { code: 'viewed_pages', n: signals.pageViews },
        { code: 'no_clear_pattern' },
      ],
    };
  }
  const [primary, ...others] = matched;
  return { segment: primary.id, tags: others.map((m) => m.id), reasons: primary.reasons };
}

// ---------------------------------------------------------------------------
// 3. Intent score
// ---------------------------------------------------------------------------

/**
 * Weighted, recency-decayed sum of events, capped per type and clamped to 0-max.
 * @returns {{ score: number, breakdown: Record<string, number> }}
 */
function intentScore(events, { now = new Date(), config = DEFAULT_CONFIG } = {}) {
  const { weights, caps, halfLifeDays, max } = config.score;
  const nowMs = toTime(now);
  const byType = {};

  for (const event of events) {
    const weight = weights[event.type] ?? 0;
    if (weight === 0) continue;
    const ageDays = Math.max(0, nowMs - toTime(event.timestamp)) / DAY_MS;
    const decay = 0.5 ** (ageDays / halfLifeDays);
    byType[event.type] = (byType[event.type] ?? 0) + weight * decay;
  }

  const breakdown = {};
  let total = 0;
  for (const [type, points] of Object.entries(byType)) {
    const capped = caps[type] != null ? Math.min(points, caps[type]) : points;
    breakdown[type] = Math.round(capped * 10) / 10;
    total += capped;
  }
  return { score: Math.round(Math.min(max, Math.max(0, total))), breakdown };
}

// ---------------------------------------------------------------------------
// 4. Explanation (EN / PT)
// ---------------------------------------------------------------------------

const plural = (n, one, many) => (n === 1 ? one : many);

const REASON_TEXT = {
  en: {
    added_to_cart: ({ n }) => `added ${n} ${plural(n, 'item', 'items')} to the bag`,
    started_checkout: ({ n }) => `started checkout ${n} ${plural(n, 'time', 'times')}`,
    purchased: ({ n }) => `completed ${n} ${plural(n, 'order', 'orders')}`,
    promo_entry: ({ campaign, source, medium }) =>
      `arrived through ${campaign ? `the "${campaign}" campaign` : `${source ?? medium} traffic`}`,
    sale_share: ({ pct, n, total }) => `${pct}% of the products viewed were on sale (${n} of ${total})`,
    viewed_products: ({ n }) => `viewed ${n} ${plural(n, 'product', 'products')}`,
    used_filters: ({ n }) => `used filters ${n} ${plural(n, 'time', 'times')}`,
    opened_size_guide: ({ n }) => `opened the size guide ${n} ${plural(n, 'time', 'times')}`,
    revisited_products: ({ n }) => `went back to ${n} ${plural(n, 'product', 'products')} already seen`,
    active_days: ({ n }) => `was active on ${n} different days`,
    sessions: ({ n }) => `across ${n} ${plural(n, 'session', 'sessions')}`,
    single_page: () => 'saw a single page',
    short_visit: ({ seconds }) => `stayed ${seconds} s`,
    no_interaction: () => 'did not interact',
    viewed_pages: ({ n }) => `viewed ${n} ${plural(n, 'page', 'pages')}`,
    no_clear_pattern: () => 'without a clear buying or comparison pattern',
  },
  pt: {
    added_to_cart: ({ n }) => `adicionou ${n} ${plural(n, 'artigo', 'artigos')} ao saco`,
    started_checkout: ({ n }) => `iniciou o checkout ${n} ${plural(n, 'vez', 'vezes')}`,
    purchased: ({ n }) => `concluiu ${n} ${plural(n, 'encomenda', 'encomendas')}`,
    promo_entry: ({ campaign, source, medium }) =>
      `entrou pela ${campaign ? `campanha "${campaign}"` : `origem ${source ?? medium}`}`,
    sale_share: ({ pct, n, total }) => `${pct}% dos produtos vistos estavam em promoção (${n} de ${total})`,
    viewed_products: ({ n }) => `viu ${n} ${plural(n, 'produto', 'produtos')}`,
    used_filters: ({ n }) => `usou filtros ${n} ${plural(n, 'vez', 'vezes')}`,
    opened_size_guide: ({ n }) => `abriu o guia de tamanhos ${n} ${plural(n, 'vez', 'vezes')}`,
    revisited_products: ({ n }) => `voltou a ${n} ${plural(n, 'produto', 'produtos')} já ${plural(n, 'visto', 'vistos')}`,
    active_days: ({ n }) => `esteve ativo em ${n} dias diferentes`,
    sessions: ({ n }) => `em ${n} ${plural(n, 'sessão', 'sessões')}`,
    single_page: () => 'viu uma única página',
    short_visit: ({ seconds }) => `ficou ${seconds} s`,
    no_interaction: () => 'não interagiu',
    viewed_pages: ({ n }) => `viu ${n} ${plural(n, 'página', 'páginas')}`,
    no_clear_pattern: () => 'sem um padrão claro de compra ou comparação',
  },
};

const JOINERS = { en: 'and', pt: 'e' };
const LEAD = { en: 'Classified as', pt: 'Classificado como' };

function joinList(parts, lang) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} ${JOINERS[lang]} ${parts[parts.length - 1]}`;
}

/**
 * "Classified as Comparer: viewed 6 products, opened the size guide 2 times and ..."
 * @param {{ segment: string, reasons: Array<{ code: string }> }} classification
 * @param {'en' | 'pt'} [lang]
 */
function explain({ segment, reasons }, lang = 'en') {
  const texts = REASON_TEXT[lang] ?? REASON_TEXT.en;
  const parts = reasons.map((r) => texts[r.code](r));
  return `${LEAD[lang] ?? LEAD.en} ${segmentLabel(segment, lang)}: ${joinList(parts, lang)}.`;
}

function segmentLabel(segment, lang = 'en') {
  return SEGMENT_LABELS[segment]?.[lang] ?? segment;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Full analysis of one visitor.
 * @param {Array<object>} events
 * @param {{ now?: Date, config?: object }} [options] `now` is injectable for reproducible results
 */
function segmentVisitor(events, { now = new Date(), config = DEFAULT_CONFIG } = {}) {
  const signals = extractSignals(events, { config });
  const classification = classify(signals, { config });
  const { score, breakdown } = intentScore(events, { now, config });
  return {
    ...classification,
    score,
    scoreBreakdown: breakdown,
    signals,
    explanation: { en: explain(classification, 'en'), pt: explain(classification, 'pt') },
  };
}

module.exports = {
  segmentVisitor,
  extractSignals,
  classify,
  intentScore,
  explain,
  segmentLabel,
  SEGMENT_LABELS,
};
