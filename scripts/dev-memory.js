/**
 * Runs the app against a throwaway in-memory MongoDB, so the tracking
 * pipeline can be tried without installing MongoDB or creating an Atlas
 * cluster. Data is lost when the process stops.
 *
 * Usage: npm run dev:memory
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('visitor-journey-memory');
  console.log('In-memory MongoDB started (data is not persisted)');

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
