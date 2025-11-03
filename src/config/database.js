const mongoose = require('mongoose');

async function connectDatabase(uri, dbName) {
  if (!uri) {
    throw new Error('MONGODB_URI is not configured. Please set it in your environment.');
  }

  mongoose.set('strictQuery', true);

  const connectionOptions = {
    serverSelectionTimeoutMS: 5000
  };

  if (dbName) {
    connectionOptions.dbName = dbName;
  }

  await mongoose.connect(uri, connectionOptions);
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
