const dotenv = require('dotenv');

dotenv.config();

function parseCorsOrigins(rawOrigins) {
  if (!rawOrigins || !rawOrigins.trim()) {
    return ['*'];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME,
  expaUrl: process.env.EXPA_URL || 'https://gis-api.aiesec.org/graphql',
  expaToken: process.env.EXPA_API_TOKEN,
  corsOrigins: parseCorsOrigins(process.env.CORS_ALLOW_ORIGINS)
};

module.exports = config;
