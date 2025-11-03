const config = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const { syncPeople } = require('../services/peopleService');

async function run() {
  try {
    await connectDatabase(config.mongoUri, config.mongoDbName);

    const page = Number.parseInt(process.env.SYNC_PAGE || '1', 10);
    const perPage = Number.parseInt(process.env.SYNC_PER_PAGE || '50', 10);
    const result = await syncPeople({
      page: Number.isNaN(page) ? 1 : page,
      perPage: Number.isNaN(perPage) ? 50 : perPage,
      filters: process.env.SYNC_FILTERS ? JSON.parse(process.env.SYNC_FILTERS) : null,
      q: process.env.SYNC_QUERY || null
    });

    console.log(
      `[syncPeopleJob] Success fetched=${result?.fetched} eligible=${result?.eligible} inserted=${result?.inserted} skipped=${result?.skipped}`
    );
  } catch (error) {
    console.error('[syncPeopleJob] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  run();
}

module.exports = run;
