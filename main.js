import TelegramBot from './src/bot/index.js';
import logger from './src/utils/logger.js';
import config from './src/config/config.js';

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

const bot = new TelegramBot();
bot.start();

console.log('🚀 ربات در حال اجراست...');