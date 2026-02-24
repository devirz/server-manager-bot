import { Bot } from 'grammy';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import authMiddleware from './middleware/auth.js';
import loggingMiddleware from './middleware/logger.js';
import errorHandlerMiddleware from './middleware/errorHandler.js';

// هندلرهای قدیمی
import commandHandler from './handlers/commandHandler.js';
import systemHandler from './handlers/systemHandler.js';

// هندلرهای جدید
import backupHandler from './handlers/backupHandler.js';
import userHandler from './handlers/userHandler.js';
import processHandler from './handlers/processHandler.js';
import updateHandler from './handlers/updateHandler.js';
import monitoringHandler from './handlers/monitoringHandler.js';
import firewallHandler from './handlers/firewallHandler.js';

export class TelegramBot {
  #bot;

  constructor() {
    this.#bot = new Bot(config.bot.token);
    this.#setupMiddleware();
    this.#setupHandlers();
    this.#setupErrorHandler();
  }

  #setupMiddleware() {
    this.#bot.use(errorHandlerMiddleware);
    this.#bot.use(loggingMiddleware);
    this.#bot.use(authMiddleware);
  }

  #setupHandlers() {
    // هندلرهای اصلی
    this.#bot.use(commandHandler);
    this.#bot.use(systemHandler);
    
    // هندلرهای جدید
    this.#bot.use(backupHandler);
    this.#bot.use(userHandler);
    this.#bot.use(processHandler);
    this.#bot.use(updateHandler);
    this.#bot.use(monitoringHandler);
    this.#bot.use(firewallHandler);
    // هندلر پیش‌فرض
    this.#bot.on('message:text', async (ctx) => {
      await ctx.reply('❌ دستور نامعتبر. برای راهنما /help را بزنید');
    });
  }

  #setupErrorHandler() {
    this.#bot.catch((err) => {
      logger.error(`Bot error: ${err.message}`);
      console.error('Bot error details:', err);
    });
  }

  async start() {
    try {
      await this.#bot.start({
        onStart: (botInfo) => {
          logger.info(`✅ ربات ${botInfo.username} با موفقیت شروع به کار کرد`);
          console.log(`✅ ربات @${botInfo.username} فعال شد`);
          console.log('📦 قابلیت‌های جدید: بکاپ، مدیریت کاربران، مدیریت فرآیندها، آپدیت سیستم');
        }
      });
    } catch (error) {
      logger.error(`Failed to start bot: ${error.message}`);
      process.exit(1);
    }
  }
}

export default TelegramBot;