/**
 * Runs the app against a throwaway in-memory MongoDB, so the store, tracking
 * and dashboard can be tried without installing MongoDB or creating an Atlas
 * cluster. The demo dataset is seeded on start; data is lost when it stops.
 *
 * Usage: npm run dev:memory              (seeded with the demo dataset)
 *        npm run dev:memory -- --no-seed (empty database)
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB } = require('../server/db');
const { seed } = require('./seed');

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('visitor-journey-memory');
  console.log('In-memory MongoDB started (data is not persisted)');

  if (!process.argv.includes('--no-seed')) {
    await connectDB(process.env.MONGODB_URI);
    await seed();
    await disconnectDB();
  }

  const stop = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  require('../server/index');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
