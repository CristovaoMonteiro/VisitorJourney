const { randomUUID } = require('crypto');

/** Builds a valid event; override any field per test. */
function makeEvent(overrides = {}) {
  return {
    eventId: randomUUID(),
    visitorId: '3f1c2b7e-8a4d-4c1e-9b2a-5d6e7f8a9b0c',
    sessionId: '7a90c3d2-1e4f-4b6a-8c9d-0e1f2a3b4c5d',
    type: 'view_product',
    timestamp: new Date().toISOString(),
    page: '/product',
    referrer: 'google.com',
    utm_source: 'newsletter',
    utm_medium: 'email',
    utm_campaign: 'autumn-sale',
    device: 'mobile',
    properties: { productId: 'p02', category: 'shirts', price: 89, onSale: true },
    ...overrides,
  };
}

module.exports = { makeEvent };
