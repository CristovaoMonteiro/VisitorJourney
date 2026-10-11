/**
 * Privacy-first visitor tracking.
 *
 * - Starts only after consent (see consent.js / layout.js) and never sends personal data.
 * - visitorId: random UUID in localStorage, created on consent, deleted on withdrawal.
 * - Session: a new sessionId after 30 minutes of inactivity or when a new UTM campaign arrives.
 * - Events are batched (every 5 s or 10 events) and flushed with sendBeacon when the page is hidden.
 * - The store emits domain events (product:view, cart:add, ...); this module maps them to the
 *   documented event schema, so tracking never has to be wired into page code.
 */
import { isOnSale } from './catalog.js';

const ENDPOINT = '/api/events';
const KEYS = { visitor: 'orlo_vid', session: 'orlo_session', queue: 'orlo_event_queue' };
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const FLUSH_INTERVAL_MS = 5000;
const BATCH_SIZE = 10;
const MAX_BATCH = 20; // must match the API limit
const MAX_QUEUE = 100;
const SCROLL_THRESHOLDS = [25, 50, 75, 100];
const UTM_FIELDS = ['source', 'medium', 'campaign'];

const PAGE_TYPES = {
  '/': 'home',
  '/collection': 'collection',
  '/product': 'product',
  '/cart': 'cart',
  '/checkout': 'checkout',
};

let started = false;
let queue = [];
let flushTimer = null;
let cleanups = [];
// Captured once per page load: where this visit came from.
const landing = { utm: null, referrer: null };

// ---------------------------------------------------------------------------
// Storage helpers (all wrapped: tracking must never break the store)
// ---------------------------------------------------------------------------
function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: tracking degrades to this page only.
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older browsers: RFC 4122 v4 from getRandomValues.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------------------------------------------------------------------------
// Context: page, device, acquisition
// ---------------------------------------------------------------------------
function currentPage() {
  const path = window.location.pathname.replace(/\.html$/, '').replace(/(.)\/$/, '$1');
  const safe = path.replace(/[^A-Za-z0-9\-_/.]/g, '').slice(0, 200);
  return safe.startsWith('/') ? safe : '/';
}

function pageType(page) {
  return PAGE_TYPES[page] ?? 'other';
}

function device() {
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const touchTablet = window.matchMedia('(pointer: coarse) and (max-width: 1024px)').matches;
  return narrow || touchTablet ? 'mobile' : 'desktop';
}

/** Normalises a UTM value to the API format: lowercase [a-z0-9_-.], max 100 chars. */
function cleanUtm(value) {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_\-.]/g, '')
    .slice(0, 100);
  return cleaned || null;
}

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(UTM_FIELDS.map((f) => [f, cleanUtm(params.get(`utm_${f}`))]));
  return utm.source || utm.medium || utm.campaign ? utm : null;
}

/** External referrer hostname only (no path, no query); null for direct or internal traffic. */
function externalReferrer() {
  try {
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host === window.location.hostname.replace(/^www\./, '') || !host.includes('.')) return null;
    return host;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Identity and sessions
// ---------------------------------------------------------------------------
function visitorId() {
  let id = read(KEYS.visitor);
  if (typeof id !== 'string') {
    id = uuid();
    write(KEYS.visitor, id);
  }
  return id;
}

const sameUtm = (a, b) => UTM_FIELDS.every((f) => (a?.[f] ?? null) === (b?.[f] ?? null));

/**
 * Returns the active session, starting a new one after 30 minutes of
 * inactivity or when the visitor arrives through a different campaign.
 * UTMs and referrer belong to the session, so every event keeps its acquisition source.
 */
function touchSession(now) {
  let session = read(KEYS.session);
  const expired = !session || now - session.lastActivity > SESSION_TIMEOUT_MS;
  const newCampaign = landing.utm && !sameUtm(landing.utm, session?.utm);
  if (expired || newCampaign) {
    session = { id: uuid(), utm: landing.utm, referrer: landing.referrer };
    // A new campaign only opens one session per page load.
    landing.utm = null;
  }
  session.lastActivity = now;
  write(KEYS.session, session);
  return session;
}

// ---------------------------------------------------------------------------
// Queue and transport
// ---------------------------------------------------------------------------
function track(type, properties = {}) {
  if (!started) return;
  const now = Date.now();
  const session = touchSession(now);
  const page = currentPage();
  queue.push({
    eventId: uuid(),
    visitorId: visitorId(),
    sessionId: session.id,
    type,
    timestamp: new Date(now).toISOString(),
    page,
    referrer: session.referrer ?? null,
    utm_source: session.utm?.source ?? null,
    utm_medium: session.utm?.medium ?? null,
    utm_campaign: session.utm?.campaign ?? null,
    device: device(),
    properties,
  });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  if (queue.length >= BATCH_SIZE) flush();
}

/** Sends one batch with fetch; failed batches go back to the front of the queue. */
async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, MAX_BATCH);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
    if (res.status === 400) {
      // A malformed batch will never succeed: drop it rather than retry forever.
      console.warn('[tracker] batch rejected', await res.json().catch(() => ({})));
    } else if (!res.ok) {
      requeue(batch);
    }
  } catch {
    requeue(batch);
  }
}

function requeue(batch) {
  queue = [...batch, ...queue].slice(0, MAX_QUEUE);
}

/** Page is being hidden or closed: beacon everything, persist what could not be sent. */
function flushOnExit() {
  while (queue.length > 0) {
    const batch = queue.splice(0, MAX_BATCH);
    const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' });
    if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
      requeue(batch);
      write(KEYS.queue, queue);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Listeners
// ---------------------------------------------------------------------------
function listen(target, name, handler, options) {
  target.addEventListener(name, handler, options);
  cleanups.push(() => target.removeEventListener(name, handler, options));
}

const round2 = (n) => Math.round(n * 100) / 100;

const productProps = (product) => ({
  productId: product.id,
  category: product.category,
  price: product.price,
});

/** Maps the store's domain events to tracking events. */
const DOMAIN_EVENTS = {
  'product:view': ({ product }) => track('view_product', { ...productProps(product), onSale: isOnSale(product) }),
  'sizeguide:open': ({ product }) =>
    track('view_size_guide', { productId: product.id, category: product.category }),
  'cart:add': ({ product, size, qty }) =>
    track('add_to_cart', { ...productProps(product), size, qty, onSale: isOnSale(product) }),
  'cart:remove': ({ product, size, qty }) => track('remove_from_cart', { ...productProps(product), size, qty }),
  'filter:apply': ({ filter, value }) => track('apply_filter', { filter, value: String(value).slice(0, 40) }),
  'checkout:start': ({ cart }) =>
    track('checkout_start', {
      itemCount: cart.lines.reduce((sum, l) => sum + l.qty, 0),
      value: round2(cart.total),
    }),
  purchase: ({ ref, cart, delivery }) => {
    track('purchase', {
      orderRef: ref,
      itemCount: cart.lines.reduce((sum, l) => sum + l.qty, 0),
      value: round2(cart.total),
      shipping: round2(cart.shipping),
      delivery,
    });
    // The most valuable event: send it straight away.
    flush();
  },
  'newsletter:signup': ({ source }) => track('newsletter_signup', { source }),
};

function trackScrollDepth() {
  const reached = new Set();
  let ticking = false;
  const measure = () => {
    ticking = false;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    // Pages that fit on screen have no meaningful scroll depth.
    if (scrollable <= 0) return;
    const percent = ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
    SCROLL_THRESHOLDS.forEach((depth) => {
      if (percent >= depth - 0.5 && !reached.has(depth)) {
        reached.add(depth);
        track('scroll_depth', { depth });
      }
    });
  };
  listen(
    window,
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(measure);
      }
    },
    { passive: true },
  );
}

function trackCtaClicks() {
  listen(
    document,
    'click',
    (e) => {
      const el = e.target.closest?.('[data-cta]');
      if (!el) return;
      const cta = el.dataset.cta.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 60);
      const props = { cta };
      const href = el.getAttribute('href');
      if (href) {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) props.href = url.pathname;
      }
      track('click_cta', props);
    },
    { capture: true },
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function startTracking() {
  if (started) return;
  started = true;

  // Events that could not be sent when the previous page closed.
  const pending = read(KEYS.queue);
  if (Array.isArray(pending)) queue = pending.slice(-MAX_QUEUE);
  remove(KEYS.queue);

  landing.utm = readUtm();
  landing.referrer = externalReferrer();

  Object.entries(DOMAIN_EVENTS).forEach(([name, handler]) => listen(window, name, (e) => handler(e.detail ?? {})));
  trackScrollDepth();
  trackCtaClicks();
  listen(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushOnExit();
  });
  listen(window, 'pagehide', flushOnExit);

  flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
  track('page_view', { pageType: pageType(currentPage()) });
}

/** Consent withdrawn: stop immediately and delete every identifier from this browser. */
export function stopTracking() {
  started = false;
  clearInterval(flushTimer);
  cleanups.forEach((fn) => fn());
  cleanups = [];
  queue = [];
  Object.values(KEYS).forEach(remove);
}
