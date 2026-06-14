const mongoose = require('mongoose');

function getMongoStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    configured: Boolean(process.env.MONGODB_URI),
    connected: mongoose.connection.readyState === 1,
    state: states[mongoose.connection.readyState] || 'unknown',
    database: mongoose.connection.name || null
  };
}

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI is not configured. Crawl history and search will be disabled.');
    return getMongoStatus();
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }

  return getMongoStatus();
}

module.exports = {
  connectDatabase,
  getMongoStatus
};
