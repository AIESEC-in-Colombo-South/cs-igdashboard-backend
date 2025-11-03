const config = require('./config/env');
const { connectDatabase } = require('./config/database');
const createApp = require('./app');

async function bootstrap() {
  try {
    await connectDatabase(config.mongoUri, config.mongoDbName);
    const app = createApp();

    app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

bootstrap();
