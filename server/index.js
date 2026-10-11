require('dotenv').config();

const { createApp } = require('./app');
const { connectDB } = require('./db');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      await connectDB(uri);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error(`Could not connect to MongoDB: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.warn('MONGODB_URI is not set: the store runs, but POST /api/events returns 503.');
  }

  createApp().listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
