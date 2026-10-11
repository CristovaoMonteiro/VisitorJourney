const os = require('os');
const mongoose = require('mongoose');
const Event = require('./models/Event');

/** Connects to MongoDB and makes sure all indexes (incl. unique + TTL) exist. */
async function connectDB(uri) {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    // The driver loads `os` with a dynamic import(), which Jest's CommonJS sandbox
    // cannot run. Passing it explicitly behaves the same everywhere else.
    runtimeAdapters: { os },
  });
  await Event.init();
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
