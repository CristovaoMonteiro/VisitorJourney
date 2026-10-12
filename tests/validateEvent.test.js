const { validateEvent } = require('../server/events/validateEvent');
const { makeEvent } = require('./helpers/makeEvent');

const NOW = new Date('2026-10-11T12:00:00Z');
const at = (iso) => ({ timestamp: iso });
const validate = (overrides) =>
  validateEvent(makeEvent({ timestamp: NOW.toISOString(), ...overrides }), { now: NOW });

describe('validateEvent', () => {
  test('accepts a valid event and converts the timestamp to a Date', () => {
    const result = validate();
    expect(result.ok).toBe(true);
    expect(result.value.timestamp).toBeInstanceOf(Date);
  });

  test('accepts null acquisition fields (direct traffic)', () => {
    const result = validate({ referrer: null, utm_source: null, utm_medium: null, utm_campaign: null });
    expect(result.ok).toBe(true);
  });

  test('rejects unknown top-level fields, so personal data cannot sneak in', () => {
    const result = validate({ email: 'someone@example.com' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('email is not allowed');
  });

  test('rejects unknown properties for the event type', () => {
    const result = validate({ type: 'newsletter_signup', properties: { source: 'club', email: 'x@y.z' } });
    expect(result.errors).toContain('properties.email is not allowed');
  });

  test('requires every documented field', () => {
    const event = makeEvent();
    delete event.visitorId;
    const result = validateEvent(event, { now: new Date() });
    expect(result.errors).toContain('visitorId is required');
  });

  test('rejects an unknown event type', () => {
    expect(validate({ type: 'hover' }).ok).toBe(false);
  });

  test('rejects products that are not in the catalogue', () => {
    const result = validate({
      properties: { productId: 'p99', category: 'shirts', price: 10, onSale: false },
    });
    expect(result.errors[0]).toMatch(/^properties\.productId/);
  });

  test('only accepts the four scroll thresholds', () => {
    expect(validate({ type: 'scroll_depth', properties: { depth: 50 } }).ok).toBe(true);
    expect(validate({ type: 'scroll_depth', properties: { depth: 60 } }).ok).toBe(false);
  });

  test('rejects pages with a query string and referrers with a path', () => {
    expect(validate({ page: '/product?slug=x' }).ok).toBe(false);
    expect(validate({ referrer: 'https://google.com/search?q=x' }).ok).toBe(false);
  });

  test('rejects timestamps older than 7 days or in the future', () => {
    expect(validate(at('2026-09-01T00:00:00Z')).errors).toContain('timestamp is too old');
    expect(validate(at('2026-10-11T13:00:00Z')).errors).toContain('timestamp is in the future');
  });

  test('accepts a purchase with optional-free strict properties', () => {
    const result = validate({
      type: 'purchase',
      properties: {
        orderRef: 'ORL-AB12CD',
        itemCount: 2,
        value: 124.95,
        shipping: 6.95,
        delivery: 'standard',
      },
    });
    expect(result.ok).toBe(true);
  });

  test('click_cta href is optional but must be a site path', () => {
    expect(validate({ type: 'click_cta', properties: { cta: 'hero_collection' } }).ok).toBe(true);
    expect(
      validate({ type: 'click_cta', properties: { cta: 'hero', href: 'https://evil.example' } }).ok,
    ).toBe(false);
  });

  test('rejects non-object payloads', () => {
    expect(validateEvent(null).ok).toBe(false);
    expect(validateEvent([]).ok).toBe(false);
  });
});
