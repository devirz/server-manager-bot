import { Composer } from 'grammy';
import backupService from '../../services/backupService.js';
import fs from 'fs/promises';
import path from 'path';

const composer = new Composer();

// دستور /backup
composer.command('backup', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const type = args[0] || 'system';

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💾 بکاپ سیستم', callback_data: 'backup_system' },
          { text: '🗄 بکاپ دیتابیس', callback_data: 'backup_db' }
        ],
        [
          { text: '📋 لیست بکاپ‌ها', callback_data: 'backup_list' },
          { text: '🧹 پاکسازی بکاپ‌ها', callback_data: 'backup_cleanup' }
        ]
      ]
    }
  };

  await ctx.reply('🔰 **مدیریت پشتیبان‌گیری**\n\nیکی از گزینه‌های زیر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// هندلر کالبک برای بکاپ
composer.callbackQuery(/^backup_(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply('🔄 در حال پردازش درخواست...');

  try {
    switch (action) {
      case 'system':
        await handleSystemBackup(ctx);
        break;
      case 'db':
        await handleDatabaseBackup(ctx);
        break;
      case 'list':
        await handleListBackups(ctx);
        break;
      case 'cleanup':
        await handleCleanupBackups(ctx);
        break;
    }
  } catch (error) {
    await ctx.reply(`❌ خطا: ${error.message}`);
  }
});

async function handleSystemBackup(ctx) {
  await ctx.reply('🔄 در حال ایجاد بکاپ از فایل‌های سیستمی...');
  
  const result = await backupService.createSystemBackup({
    includeEtc: true,
    includeHome: true,
    includeVar: false,
    includeLogs: false
  });

  if (result.success) {
    // ارسال فایل بکاپ
    await ctx.replyWithDocument({
      source: result.path,
      filename: result.name
    }, {
      caption: `✅ **بکاپ با موفقیت ایجاد شد**\n📁 نام: ${result.name}\n📦 حجم: ${result.size}`
    });

    // پاکسازی فایل موقت
    await fs.unlink(result.path).catch(() => {});
  } else {
    await ctx.reply(`❌ خطا در ایجاد بکاپ: ${result.error}`);
  }
}

async function handleDatabaseBackup(ctx) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'MySQL', callback_data: 'backup_db_mysql' },
          { text: 'PostgreSQL', callback_data: 'backup_db_postgresql' }
        ]
      ]
    }
  };

  await ctx.reply('🗄 **نوع دیتابیس را انتخاب کنید:**', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

async function handleListBackups(ctx) {
  const backupDir = '/tmp/server-backups';
  try {
    const files = await fs.readdir(backupDir);
    
    if (files.length === 0) {
      await ctx.reply('📭 هیچ بکاپی یافت نشد');
      return;
    }

    let message = '**📋 لیست بکاپ‌های موجود:**\n\n';
    
    for (const file of files.slice(-10)) { // آخرین 10 بکاپ
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const date = stats.mtime.toLocaleString('fa-IR');
      
      message += `📁 \`${file}\`\n📦 ${size} MB | 🕐 ${date}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('📭 هیچ بکاپی یافت نشد');
  }
}

async function handleCleanupBackups(ctx) {
  await ctx.reply('🧹 در حال پاکسازی بکاپ‌های قدیمی...');
  
  const result = await backupService.cleanupOldBackups(7); // حذف بکاپ‌های قدیمی‌تر از 7 روز
  
  if (result.success) {
    await ctx.reply(`✅ ${result.deletedCount} بکاپ قدیمی پاکسازی شد`);
  } else {
    await ctx.reply(`❌ خطا در پاکسازی: ${result.error}`);
  }
}

// هندلر کالبک برای نوع دیتابیس
composer.callbackQuery(/^backup_db_(.+)$/, async (ctx) => {
  const dbType = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال ایجاد بکاپ از ${dbType}...`);

  const result = await backupService.createDatabaseBackup(dbType);

  if (result.success) {
    await ctx.replyWithDocument({
      source: result.path,
      filename: result.name
    }, {
      caption: `✅ **بکاپ دیتابیس با موفقیت ایجاد شد**\n📁 نام: ${result.name}\n📦 حجم: ${result.size}`
    });

    await fs.unlink(result.path).catch(() => {});
  } else {
    await ctx.reply(`❌ خطا در ایجاد بکاپ: ${result.error}`);
  }
});

export default composer;