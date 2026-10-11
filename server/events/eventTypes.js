/**
 * Single source of truth for the event contract shared by the API validator
 * and the Mongoose model. See README "Event schema" for the rationale.
 */
const products = require('../../data/products.json');

const EVENT_TYPES = [
  'page_view',
  'scroll_depth',
  'click_cta',
  'view_product',
  'apply_filter',
  'view_size_guide',
  'add_to_cart',
  'remove_from_cart',
  'checkout_start',
  'purchase',
  'newsletter_signup',
];

const DEVICES = ['mobile', 'desktop'];
const PAGE_TYPES = ['home', 'collection', 'product', 'cart', 'checkout', 'other'];
const SCROLL_DEPTHS = [25, 50, 75, 100];
const FILTERS = ['category', 'price', 'sale', 'sort', 'clear'];
const DELIVERY_METHODS = ['standard', 'express'];
const NEWSLETTER_SOURCES = ['club', 'footer', 'home'];

// Derived from the catalogue so the API never accepts unknown products or categories.
const PRODUCT_IDS = products.map((p) => p.id);
const CATEGORIES = [...new Set(products.map((p) => p.category))];

const LIMITS = {
  maxEventsPerRequest: 20,
  // Events queued offline may arrive late, but not from the distant past or the future.
  maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  maxClockSkewMs: 5 * 60 * 1000,
  // Raw events are deleted automatically after ~13 months (TTL index).
  retentionSeconds: 395 * 24 * 60 * 60,
};

module.exports = {
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
};
