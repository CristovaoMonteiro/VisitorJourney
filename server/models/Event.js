const mongoose = require('mongoose');
const { EVENT_TYPES, DEVICES, LIMITS } = require('../events/eventTypes');

/**
 * One tracked interaction. Payloads are validated in full by
 * events/validateEvent.js before they get here; the model keeps a second,
 * coarser line of defence and owns the indexes.
 */
const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true },
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true },
    type: { type: String, required: true, enum: EVENT_TYPES },
    timestamp: { type: Date, required: true },
    receivedAt: { type: Date, required: true, default: Date.now },
    page: { type: String, required: true, maxlength: 200 },
    referrer: { type: String, default: null },
    utm_source: { type: String, default: null },
    utm_medium: { type: String, default: null },
    utm_campaign: { type: String, default: null },
    device: { type: String, required: true, enum: DEVICES },
    properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'events',
    versionKey: false,
    // Reject any field outside the schema instead of silently dropping it.
    strict: 'throw',
    minimize: false,
  },
);

// Idempotency: a retried batch never creates duplicates.
eventSchema.index({ eventId: 1 }, { unique: true });
// A visitor's journey in chronological order (dashboard detail view).
eventSchema.index({ visitorId: 1, timestamp: 1 });
// Date-range filters across the dashboard.
eventSchema.index({ timestamp: -1 });
// Funnel and per-type counts within a date range.
eventSchema.index({ type: 1, timestamp: -1 });
// GDPR storage limitation: raw events expire automatically.
eventSchema.index({ receivedAt: 1 }, { expireAfterSeconds: LIMITS.retentionSeconds });

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
