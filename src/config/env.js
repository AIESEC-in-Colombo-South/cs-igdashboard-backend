const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME,
  expaUrl: process.env.EXPA_URL || 'https://gis-api.aiesec.org/graphql',
  expaToken: process.env.EXPA_API_TOKEN
};

module.exports = config;
