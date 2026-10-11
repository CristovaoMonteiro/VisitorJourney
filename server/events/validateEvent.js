/**
 * Strict, dependency-free validation for incoming tracking events.
 * Unknown fields are rejected so nothing outside the documented schema
 * (e.g. personal data) can ever be stored.
 */
const {
  EVENT_TYPES,
  DEVICES,
  PAGE_TYPES,
  SCROLL_DEPTHS,
  FILTERS,
  DELIVERY_METHODS,
  NEWSLETTER_SOURCES,
  PRODUCT_IDS,
  CATEGORIES,
  LIMITS,
} = require('./eventTypes');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH_RE = /^\/[A-Za-z0-9\-_/.]*$/;
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
const UTM_RE = /^[a-z0-9_\-.]{1,100}$/;
const CTA_RE = /^[a-z0-9_]{1,60}$/;
const ORDER_REF_RE = /^[A-Z0-9]{2,5}-[A-Z0-9]{4,10}$/;
const SIZE_RE = /^[A-Z0-9]{1,6}$/;

// --- Field validators: each returns an error message, or null when valid. ---
const oneOf = (allowed) => (v) => (allowed.includes(v) ? null : `must be one of: ${allowed.join(', ')}`);
const matches = (re, label) => (v) => (typeof v === 'string' && re.test(v) ? null : `must be ${label}`);
const intBetween = (min, max) => (v) =>
  Number.isInteger(v) && v >= min && v <= max ? null : `must be an integer between ${min} and ${max}`;
const money = (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100000 ? null : 'must be an amount between 0 and 100000';
const bool = (v) => (typeof v === 'boolean' ? null : 'must be a boolean');
const shortText = (max) => (v) =>
  typeof v === 'string' && v.length > 0 && v.length <= max ? null : `must be a string of 1-${max} characters`;
const optional = (validate) => Object.assign((v) => validate(v), { optional: true });
const nullable = (validate) => (v) => (v === null ? null : validate(v));

const productId = oneOf(PRODUCT_IDS);
const category = oneOf(CATEGORIES);

/** Allowed `properties` per event type. Every listed key is required unless wrapped in optional(). */
const PROPERTY_RULES = {
  page_view: { pageType: oneOf(PAGE_TYPES) },
  scroll_depth: { depth: oneOf(SCROLL_DEPTHS) },
  click_cta: { cta: matches(CTA_RE, 'a snake_case CTA id'), href: optional(matches(PATH_RE, 'a site path')) },
  view_product: { productId, category, price: money, onSale: bool },
  apply_filter: { filter: oneOf(FILTERS), value: shortText(40) },
  view_size_guide: { productId, category },
  add_to_cart: { productId, category, price: money, size: matches(SIZE_RE, 'a size code'), qty: intBetween(1, 10), onSale: bool },
  remove_from_cart: { productId, category, price: money, size: matches(SIZE_RE, 'a size code'), qty: intBetween(1, 10) },
  checkout_start: { itemCount: intBetween(1, 100), value: money },
  purchase: {
    orderRef: matches(ORDER_REF_RE, 'an order reference like ORL-AB12CD'),
    itemCount: intBetween(1, 100),
    value: money,
    shipping: money,
    delivery: oneOf(DELIVERY_METHODS),
  },
  newsletter_signup: { source: oneOf(NEWSLETTER_SOURCES) },
};

const TOP_LEVEL_RULES = {
  eventId: matches(UUID_RE, 'a UUID v4'),
  visitorId: matches(UUID_RE, 'a UUID v4'),
  sessionId: matches(UUID_RE, 'a UUID v4'),
  type: oneOf(EVENT_TYPES),
  timestamp: (v) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? null : 'must be an ISO 8601 date string'),
  page: (v) => (typeof v === 'string' && v.length <= 200 && PATH_RE.test(v) ? null : 'must be a site path without query string'),
  referrer: nullable(matches(HOSTNAME_RE, 'a lowercase hostname')),
  utm_source: nullable(matches(UTM_RE, 'lowercase [a-z0-9_-.]')),
  utm_medium: nullable(matches(UTM_RE, 'lowercase [a-z0-9_-.]')),
  utm_campaign: nullable(matches(UTM_RE, 'lowercase [a-z0-9_-.]')),
  device: oneOf(DEVICES),
  properties: (v) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? null : 'must be an object'),
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function checkFields(input, rules, prefix, errors) {
  for (const key of Object.keys(input)) {
    if (!(key in rules)) errors.push(`${prefix}${key} is not allowed`);
  }
  for (const [key, validate] of Object.entries(rules)) {
    if (input[key] === undefined) {
      if (!validate.optional) errors.push(`${prefix}${key} is required`);
      continue;
    }
    const message = validate(input[key]);
    if (message) errors.push(`${prefix}${key} ${message}`);
  }
}

/**
 * Validates one raw event.
 * @param {unknown} raw
 * @param {{ now?: Date }} [options] injectable clock for tests
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
function validateEvent(raw, { now = new Date() } = {}) {
  if (!isPlainObject(raw)) return { ok: false, errors: ['event must be an object'] };

  const errors = [];
  checkFields(raw, TOP_LEVEL_RULES, '', errors);

  if (EVENT_TYPES.includes(raw.type) && isPlainObject(raw.properties)) {
    checkFields(raw.properties, PROPERTY_RULES[raw.type], 'properties.', errors);
  }

  if (!errors.some((e) => e.startsWith('timestamp'))) {
    const age = now.getTime() - Date.parse(raw.timestamp);
    if (age > LIMITS.maxAgeMs) errors.push('timestamp is too old');
    if (age < -LIMITS.maxClockSkewMs) errors.push('timestamp is in the future');
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { ...raw, timestamp: new Date(raw.timestamp) } };
}

module.exports = { validateEvent, PROPERTY_RULES };
