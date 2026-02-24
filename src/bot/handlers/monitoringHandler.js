import { Composer } from 'grammy';
import monitoringService from '../../services/monitoringService.js';

const composer = new Composer();

// منوی مانیتورینگ
composer.callbackQuery('monitor_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 لحظه‌ای', callback_data: 'monitor_realtime' },
          { text: '📈 تاریخچه CPU', callback_data: 'monitor_cpu_history' }
        ],
        [
          { text: '💾 تاریخچه رم', callback_data: 'monitor_memory_history' },
          { text: '🌐 شبکه', callback_data: 'monitor_network' }
        ],
        [
          { text: '⚡ پردازش‌ها', callback_data: 'monitor_processes' },
          { text: '👥 کاربران', callback_data: 'monitor_users' }
        ],
        [{ text: '🔙 برگشت به منو', callback_data: 'back_to_main' }]
      ]
    }
  };

  try {
    await ctx.editMessageText(
      '📊 مانیتورینگ سرور\n' +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      'هرکدوم رو می‌خوای انتخاب کن:', 
      { ...keyboard }
    );
  } catch (error) {
    await ctx.reply(
      '📊 مانیتورینگ سرور\n' +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      'هرکدوم رو می‌خوای انتخاب کن:', 
      { ...keyboard }
    );
  }
});

// مانیتورینگ لحظه‌ای با قابلیت ادیت
composer.callbackQuery('monitor_realtime', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    // نشون بده که داره کار می‌کنه (فقط اولین بار)
    if (!ctx.callbackQuery.message.text.includes('🔄')) {
      await ctx.editMessageText('🔄 یه لحظه صبر کن...');
    }
    
    const { stats, alerts } = await monitoringService.getRealTimeStats();

    const cpuBar = createProgressBar(parseFloat(stats.cpu?.currentLoad || 0), 15);
    const memBar = createProgressBar(parseFloat(stats.memory?.usagePercent || 0), 15);

    let message = '';
    message += '📊 وضعیت الان سرور\n';
    message += '━━━━━━━━━━━━━━━━━━━\n';
    message += `⏱️ زمان: ${new Date(stats.timestamp).toLocaleTimeString('fa-IR')}\n\n`;

    message += `⚡ پردازنده:\n`;
    message += `${cpuBar} ${stats.cpu?.currentLoad || 0}%\n`;
    message += `📊 لود: ${stats.system?.loadAvg?.join(' - ') || '0 - 0 - 0'}\n\n`;

    message += `💾 حافظه:\n`;
    message += `${memBar} ${stats.memory?.usagePercent || 0}%\n`;
    message += `📦 کل: ${stats.memory?.total || '0 B'}\n`;
    message += `🔄 مصرف: ${stats.memory?.used || '0 B'}\n\n`;

    message += `💽 دیسک:\n`;
    if (stats.disk && stats.disk.length > 0) {
      stats.disk.forEach(d => {
        const diskBar = createProgressBar(parseFloat(d.usePercent || 0), 10);
        message += `📁 ${d.mount}: ${diskBar} ${d.usePercent || 0}%\n`;
      });
    } else {
      message += `📁 اطلاعاتی موجود نیست\n`;
    }

    message += `\n🌐 شبکه:\n`;
    message += `📥 دریافت: ${stats.network?.rxSec || '0 B/s'}\n`;
    message += `📤 ارسال: ${stats.network?.txSec || '0 B/s'}\n\n`;

    message += `⚙️ پردازش‌ها:\n`;
    message += `📊 کل: ${stats.processes?.total || 0} | در حال اجرا: ${stats.processes?.running || 0}\n\n`;

    message += `⏱️ آپتایم: ${stats.system?.uptime || 'نامشخص'}\n`;
    message += '━━━━━━━━━━━━━━━━━━━';

    if (alerts && alerts.length > 0) {
      message += '\n\n⚠️ هشدار:\n';
      alerts.forEach(alert => {
        message += `• ${alert.message}\n`;
      });
    }

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_realtime' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    // ادیت کردن پیام فعلی
    await ctx.editMessageText(message, { ...keyboard });
    
  } catch (error) {
    console.error('❌ Monitor error:', error);
    await ctx.reply('❌ خطا! نتونستم اطلاعات رو بگیرم. لطفاً دوباره تلاش کن.');
  }
});

// شبکه با قابلیت ادیت
composer.callbackQuery('monitor_network', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    // نشون بده که داره کار می‌کنه
    if (!ctx.callbackQuery.message.text.includes('🔄')) {
      await ctx.editMessageText('🔄 یه لحظه صبر کن...');
    }
    
    const { stats } = await monitoringService.getRealTimeStats();
    
    if (!stats || !stats.network) {
      throw new Error('نتونستم اطلاعات شبکه رو بگیرم');
    }

    const network = stats.network;
    const interfaces = network.interfaces || [];

    let message = '';
    message += '🌐 وضعیت شبکه\n';
    message += '━━━━━━━━━━━━━━━━━━━\n\n';
    
    message += 'اینترفیس‌ها:\n';
    if (interfaces.length > 0) {
      interfaces.forEach(i => {
        message += `• ${i.name}: ${i.address}\n`;
      });
    } else {
      message += '• هیچ اینترفیسی پیدا نشد\n';
    }

    message += `\nترافیک لحظه‌ای:\n`;
    message += `📥 دریافت: ${network.rxSec || '0 B/s'}\n`;
    message += `📤 ارسال: ${network.txSec || '0 B/s'}\n\n`;

    message += `کل ترافیک:\n`;
    message += `📥 کل دریافت: ${network.totalRx || '0 B'}\n`;
    message += `📤 کل ارسال: ${network.totalTx || '0 B'}\n`;

    try {
      const diskIO = await monitoringService.getDiskIO();
      if (diskIO) {
        message += `\n\nورودی/خروجی دیسک:\n`;
        message += `📖 خواندن: ${diskIO.rIO || 0} عملیات\n`;
        message += `💾 نوشتن: ${diskIO.wIO || 0} عملیات`;
      }
    } catch (e) {}

    message += '\n━━━━━━━━━━━━━━━━━━━';

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_network' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    // ادیت کردن پیام فعلی
    await ctx.editMessageText(message, { ...keyboard });
    
  } catch (error) {
    console.error('❌ Network error:', error);
    await ctx.reply('❌ خطا! نتونستم اطلاعات شبکه رو بگیرم. لطفاً دوباره تلاش کن.');
  }
});

// تاریخچه CPU
composer.callbackQuery('monitor_cpu_history', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    if (!ctx.callbackQuery.message.text.includes('🔄')) {
      await ctx.editMessageText('🔄 یه لحظه صبر کن...');
    }
    
    const history = await monitoringService.getCpuHistory();
    
    if (history.length === 0) {
      await ctx.editMessageText('📭 هنوز داده‌ای جمع‌آوری نشده.');
      return;
    }

    let message = '';
    message += '📈 تاریخچه CPU\n';
    message += '━━━━━━━━━━━━━━━━━━━\n\n';

    const recentHistory = history.slice(-10);
    recentHistory.forEach(item => {
      const bar = createProgressBar(item.cpu, 10);
      message += `${item.time}: ${bar} ${item.cpu.toFixed(1)}%\n`;
    });

    message += '\n━━━━━━━━━━━━━━━━━━━';

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_cpu_history' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    await ctx.editMessageText(message, { ...keyboard });
    
  } catch (error) {
    console.error('❌ CPU history error:', error);
    await ctx.reply('❌ خطا! نتونستم تاریخچه رو بگیرم.');
  }
});

// تاریخچه رم
composer.callbackQuery('monitor_memory_history', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    if (!ctx.callbackQuery.message.text.includes('🔄')) {
      await ctx.editMessageText('🔄 یه لحظه صبر کن...');
    }
    
    const history = await monitoringService.getMemoryHistory();
    
    if (history.length === 0) {
      await ctx.editMessageText('📭 هنوز داده‌ای جمع‌آوری نشده.');
      return;
    }

    let message = '';
    message += '📈 تاریخچه رم\n';
    message += '━━━━━━━━━━━━━━━━━━━\n\n';

    const recentHistory = history.slice(-10);
    recentHistory.forEach(item => {
      const bar = createProgressBar(item.memory, 10);
      message += `${item.time}: ${bar} ${item.memory.toFixed(1)}%\n`;
    });

    message += '\n━━━━━━━━━━━━━━━━━━━';

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_memory_history' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    await ctx.editMessageText(message, { ...keyboard });
    
  } catch (error) {
    console.error('❌ Memory history error:', error);
    await ctx.reply('❌ خطا! نتونستم تاریخچه رو بگیرم.');
  }
});

// پردازش‌ها
composer.callbackQuery('monitor_processes', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    if (!ctx.callbackQuery.message.text.includes('🔄')) {
      await ctx.editMessageText('🔄 یه لحظه صبر کن...');
    }
    
    const processes = await monitoringService.getTopProcesses(15);

    let message = '';
    message += '⚡ پرمصرف‌ترین پردازش‌ها\n';
    message += '━━━━━━━━━━━━━━━━━━━\n\n';
    
    processes.forEach((p, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
      message += `${medal} ${p.name}\n`;
      message += `   📊 CPU: ${p.cpu}% | رم: ${p.mem}\n`;
      message += `   👤 ${p.user} | شناسه: ${p.pid}\n\n`;
    });

    message += '━━━━━━━━━━━━━━━━━━━';

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_processes' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    await ctx.editMessageText(message, { ...keyboard });
    
  } catch (error) {
    console.error('❌ Processes error:', error);
    await ctx.reply('❌ خطا! نتونستم لیست پردازش‌ها رو بگیرم.');
  }
});

// کاربران
composer.callbackQuery('monitor_users', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    if (!ctx.callbackQuery.message.text.includes('🔄')) {
      await ctx.editMessageText('🔄 یه لحظه صبر کن...');
    }
    
    const users = await monitoringService.getUsers();

    let message = '';
    message += '👥 کاربران آنلاین\n';
    message += '━━━━━━━━━━━━━━━━━━━\n\n';
    
    if (!users || users.length === 0) {
      message += 'هیچ کاربر فعالی پیدا نشد.';
    } else {
      users.forEach(user => {
        message += `👤 ${user.user}\n`;
        message += `   📍 از: ${user.from || '?'}\n`;
        message += `   ⏱️ ورود: ${user.time || '?'}\n`;
        if (user.ip) {
          message += `   🌐 آی‌پی: ${user.ip}\n`;
        }
        message += '\n';
      });
    }

    message += '━━━━━━━━━━━━━━━━━━━';

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_users' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    await ctx.editMessageText(message, { ...keyboard });
    
  } catch (error) {
    console.error('❌ Users error:', error);
    await ctx.reply('❌ خطا! نتونستم لیست کاربران رو بگیرم.');
  }
});

// تابع کمکی برای ساخت نوار پیشرفت
function createProgressBar(percent, length = 20) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default composer;