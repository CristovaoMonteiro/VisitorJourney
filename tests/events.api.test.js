const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../server/app');
const { connectDB, disconnectDB } = require('../server/db');
const { createRateLimiter } = require('../server/middleware/rateLimit');
const Event = require('../server/models/Event');
const { makeEvent } = require('./helpers/makeEvent');

let mongo;
let app;
const rateLimit = createRateLimiter({ windowMs: 60_000, max: 5 });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri('test'));
  app = createApp({ rateLimit });
}, 120_000);

afterEach(async () => {
  rateLimit.reset();
  await Event.deleteMany({});
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

const post = (body) => request(app).post('/api/events').send(body);

describe('POST /api/events', () => {
  test('stores a valid batch and adds the server receive time', async () => {
    const res = await post({
      events: [makeEvent(), makeEvent({ type: 'page_view', properties: { pageType: 'product' } })],
    });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: 2, duplicates: 0 });

    const stored = await Event.find().lean();
    expect(stored).toHaveLength(2);
    expect(stored[0].receivedAt).toBeInstanceOf(Date);
  });

  test('never stores the client IP or any unlisted field', async () => {
    await post({ events: [makeEvent()] });
    const stored = await Event.findOne().lean();
    const fields = Object.keys(stored).sort();
    expect(fields).toEqual(
      [
        '_id',
        'device',
        'eventId',
        'page',
        'properties',
        'receivedAt',
        'referrer',
        'sessionId',
        'timestamp',
        'type',
        'utm_campaign',
        'utm_medium',
        'utm_source',
        'visitorId',
      ].sort(),
    );
  });

  test('is idempotent: re-sent events are counted as duplicates', async () => {
    const event = makeEvent();
    await post({ events: [event] });
    const res = await post({ events: [event, makeEvent()] });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: 1, duplicates: 1 });
    expect(await Event.countDocuments()).toBe(2);
  });

  test('rejects the whole batch with per-event errors when one event is invalid', async () => {
    const res = await post({ events: [makeEvent(), makeEvent({ device: 'tablet' })] });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ index: 1, errors: [expect.stringMatching(/^device/)] }]);
    expect(await Event.countDocuments()).toBe(0);
  });

  test('rejects an empty or oversized batch', async () => {
    expect((await post({ events: [] })).status).toBe(400);
    expect((await post({ events: Array.from({ length: 21 }, () => makeEvent()) })).status).toBe(400);
    expect((await post({ foo: 1 })).status).toBe(400);
  });

  test('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Content-Type', 'application/json')
      .send('{"events": [');
    expect(res.status).toBe(400);
  });

  test('returns 413 when the payload is too large', async () => {
    const res = await post({ events: [makeEvent()], padding: 'x'.repeat(40_000) });
    expect(res.status).toBe(413);
  });

  test('rate limits a client after the configured number of requests', async () => {
    for (let i = 0; i < 5; i += 1) await post({ events: [makeEvent()] });
    const res = await post({ events: [makeEvent()] });
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeDefined();
  });

  test('creates the documented indexes, including the TTL index', async () => {
    const indexes = await Event.collection.indexes();
    const keys = indexes.map((i) => JSON.stringify(i.key));
    expect(keys).toEqual(
      expect.arrayContaining([
        '{"eventId":1}',
        '{"visitorId":1,"timestamp":1}',
        '{"timestamp":-1}',
        '{"type":1,"timestamp":-1}',
        '{"receivedAt":1}',
      ]),
    );
    expect(indexes.find((i) => i.key.eventId).unique).toBe(true);
    expect(indexes.find((i) => i.key.receivedAt).expireAfterSeconds).toBeGreaterThan(0);
  });
});
