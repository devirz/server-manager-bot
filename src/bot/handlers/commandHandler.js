import { Composer } from 'grammy';
// import commandService from '../../services/commandService.js';
// import { Validator } from '../../utils/validator.js';
// import logger from '../../utils/logger.js';

const composer = new Composer();

// منوی اصلی
composer.command('start', async (ctx) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️ راهنما', callback_data: 'help_menu' },
          { text: '🖥 سیستم', callback_data: 'system_menu' }
        ],
        [
          { text: '📊 مانیتورینگ', callback_data: 'monitor_menu' },
          { text: '🔒 فایروال', callback_data: 'firewall_menu' }
        ],
        [
          { text: '👥 کاربران', callback_data: 'users_menu' },
          { text: '💾 پشتیبان', callback_data: 'backup_menu' }
        ],
        [
          { text: '📦 آپدیت و پکیج', callback_data: 'update_menu' },
          { text: '⚡ دستور دلخواه', callback_data: 'execute_prompt' }
        ]
      ]
    }
  };

  await ctx.reply(
    '🚀 **به ربات مدیریت سرور خوش اومدی!**\n\n' +
    'با این ربات می‌تونی سرورت رو راحت مدیریت کنی.\n' +
    'هر بخشی رو می‌خوای از دکمه‌های زیر انتخاب کن:',
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// راهنما
composer.callbackQuery('help_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🖥 سیستم', callback_data: 'help_system' }],
        [{ text: '📊 مانیتورینگ', callback_data: 'help_monitor' }],
        [{ text: '🔒 فایروال', callback_data: 'help_firewall' }],
        [{ text: '👥 کاربران', callback_data: 'help_users' }],
        [{ text: '💾 پشتیبان', callback_data: 'help_backup' }],
        [{ text: '📦 پکیج', callback_data: 'help_package' }],
        [{ text: '🔙 برگشت', callback_data: 'back_to_main' }]
      ]
    }
  };

  await ctx.editMessageText(
    '📚 **راهنمای ربات**\n\n' +
    'روی هر بخش کلیک کن تا دستوراتش رو ببینی:',
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// راهنمای سیستم
composer.callbackQuery('help_system', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 برگشت به راهنما', callback_data: 'help_menu' }]
      ]
    }
  };

  await ctx.editMessageText(
    '🖥 **دستورات سیستم**\n' +
    '━━━━━━━━━━━━━━━━━━━\n\n' +
    '• /system - اطلاعات کلی سیستم\n' +
    '• /disk - فضای دیسک‌ها\n' +
    '• /ps - پردازش‌های در حال اجرا\n' +
    '• /load - بار سیستم\n' +
    '• /uptime - زمان روشن بودن\n' +
    '━━━━━━━━━━━━━━━━━━━',
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// برگشت به منوی اصلی
composer.callbackQuery('back_to_main', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'ℹ️ راهنما', callback_data: 'help_menu' },
          { text: '🖥 سیستم', callback_data: 'system_menu' }
        ],
        [
          { text: '📊 مانیتورینگ', callback_data: 'monitor_menu' },
          { text: '🔒 فایروال', callback_data: 'firewall_menu' }
        ],
        [
          { text: '👥 کاربران', callback_data: 'users_menu' },
          { text: '💾 پشتیبان', callback_data: 'backup_menu' }
        ],
        [
          { text: '📦 آپدیت و پکیج', callback_data: 'update_menu' },
          { text: '⚡ دستور دلخواه', callback_data: 'execute_prompt' }
        ]
      ]
    }
  };

  await ctx.editMessageText(
    '🚀 **منوی اصلی**\n\n' +
    'چکار می‌تونم برات انجام بدم؟',
    { parse_mode: 'Markdown', ...keyboard }
  );
});

export default composer;