import { Composer } from 'grammy';
import monitoringService from '../../services/monitoringService.js';

const composer = new Composer();
let lastMessageId = {};

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

  await ctx.editMessageText(
    '📊 **مانیتورینگ سرور**\n' +
    '━━━━━━━━━━━━━━━━━━━\n\n' +
    'هرکدوم رو می‌خوای انتخاب کن:', 
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// مانیتورینگ لحظه‌ای
composer.callbackQuery('monitor_realtime', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    const { stats, alerts } = await monitoringService.getRealTimeStats();

    const cpuBar = createProgressBar(parseFloat(stats.cpu.currentLoad), 15);
    const memBar = createProgressBar(parseFloat(stats.memory.usagePercent), 15);

    let message = `
📊 **وضعیت الان سرور**
━━━━━━━━━━━━━━━━━━━
⏱️ زمان: ${new Date(stats.timestamp).toLocaleTimeString('fa-IR')}

⚡ **پردازنده:**
${cpuBar} ${stats.cpu.currentLoad}%
📊 لود: ${stats.system.loadAvg.join(' - ')}

💾 **حافظه:**
${memBar} ${stats.memory.usagePercent}%
📦 کل: ${stats.memory.total}
🔄 مصرف: ${stats.memory.used}

💽 **دیسک:`;
    
    stats.disk.forEach(d => {
      const diskBar = createProgressBar(parseFloat(d.usePercent), 10);
      message += `\n📁 ${d.mount}: ${diskBar} ${d.usePercent}%`;
    });

    message += `\n
🌐 **شبکه:**
📥 دریافت: ${stats.network.rxSec}
📤 ارسال: ${stats.network.txSec}

⚙️ **پردازش‌ها:**
📊 کل: ${stats.processes.total} | در حال اجرا: ${stats.processes.running}

⏱️ آپتایم: ${stats.system.uptime}
━━━━━━━━━━━━━━━━━━━`;

    if (alerts.length > 0) {
      message += '\n\n⚠️ **هشدار:**\n';
      alerts.forEach(alert => {
        message += `• ${alert.message}\n`;
      });
    }

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_realtime', style: 'warning' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    const chatId = ctx.chat.id;
    if (lastMessageId[chatId] && ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, { 
          parse_mode: 'Markdown',
          ...keyboard 
        });
        return;
      } catch (error) {
        // ادامه می‌دیم و پیام جدید می‌فرستیم
      }
    }

    const sentMessage = await ctx.reply(message, { 
      parse_mode: 'Markdown',
      ...keyboard 
    });
    lastMessageId[chatId] = sentMessage.message_id;
    
  } catch (error) {
    await ctx.reply('❌ خطا! نتونستم اطلاعات رو بگیرم.');
  }
});

// شبکه
composer.callbackQuery('monitor_network', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    const stats = await monitoringService.getRealTimeStats();
    const network = stats.network;

    let message = '🌐 **وضعیت شبکه**\n';
    message += '━━━━━━━━━━━━━━━━━━━\n\n';
    
    message += '**اینترفیس‌ها:**\n';
    network.interfaces.forEach(i => {
      message += `• ${i.name}: ${i.address}\n`;
    });

    message += '\n**ترافیک لحظه‌ای:**\n';
    message += `📥 دریافت: ${network.rxSec}\n`;
    message += `📤 ارسال: ${network.txSec}\n\n`;

    message += '**کل ترافیک:**\n';
    message += `📥 کل دریافت: ${network.totalRx}\n`;
    message += `📤 کل ارسال: ${network.totalTx}\n`;
    message += '\n━━━━━━━━━━━━━━━━━━━';

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_network', style: 'warning' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    const chatId = ctx.chat.id;
    if (lastMessageId[chatId] && ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, { ...keyboard });
        return;
      } catch (error) {
        // ادامه می‌دیم
      }
    }

    const sentMessage = await ctx.reply(message, { ...keyboard });
    lastMessageId[chatId] = sentMessage.message_id;
    
  } catch (error) {
    await ctx.reply('❌ خطا! نتونستم اطلاعات شبکه رو بگیرم.');
  }
});

// پردازش‌ها
composer.callbackQuery('monitor_processes', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  try {
    const processes = await monitoringService.getTopProcesses(10);

    let message = '⚡ **پرمصرف‌ترین پردازش‌ها**\n';
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
          [{ text: '🔄 بروزرسانی', callback_data: 'monitor_processes', style: 'warning' }],
          [{ text: '🔙 برگشت', callback_data: 'monitor_menu' }]
        ]
      }
    };

    const chatId = ctx.chat.id;
    if (lastMessageId[chatId] && ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, { ...keyboard });
        return;
      } catch (error) {
        // ادامه می‌دیم
      }
    }

    const sentMessage = await ctx.reply(message, { ...keyboard });
    lastMessageId[chatId] = sentMessage.message_id;
    
  } catch (error) {
    await ctx.reply('❌ خطا! نتونستم لیست پردازش‌ها رو بگیرم.');
  }
});

function createProgressBar(percent, length = 20) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default composer;