import { Composer } from 'grammy';
import systemService from '../../services/systemService.js';

const composer = new Composer();

// منوی سیستم
composer.callbackQuery('system_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 اطلاعات کلی', callback_data: 'system_info' },
          { text: '💾 حافظه', callback_data: 'system_memory' }
        ],
        [
          { text: '💽 دیسک', callback_data: 'system_disk' },
          { text: '⚡ پردازنده', callback_data: 'system_cpu' }
        ],
        [
          { text: '📋 پردازش‌ها', callback_data: 'system_processes' },
          { text: '⏱ آپتایم', callback_data: 'system_uptime' }
        ],
        [{ text: '🔙 برگشت به منو', callback_data: 'back_to_main' }]
      ]
    }
  };

  await ctx.editMessageText(
    '🖥 **مدیریت سیستم**\n' +
    '━━━━━━━━━━━━━━━━━━━\n\n' +
    'هر قسمتی رو می‌خوای ببین:', 
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// اطلاعات کلی سیستم
composer.callbackQuery('system_info', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('🔄 یه لحظه صبر کن...');

  try {
    const info = await systemService.getSystemInfo();
    
    const message = `
🖥 **مشخصات سیستم**
━━━━━━━━━━━━━━━━━━━
🏠 **میزبان:** ${info.hostname}
💻 **سیستم عامل:** ${info.platform} ${info.arch}
📀 **نسخه:** ${info.release}
⏱ **روشن:** ${info.uptime}

💾 **حافظه:**
• کل: ${info.memory.total}
• استفاده: ${info.memory.used} (${info.memory.usagePercent}%)
• آزاد: ${info.memory.free}

⚙️ **پردازنده:**
• مدل: ${info.cpu.model}
• هسته: ${info.cpu.cores}
• لود: ${info.cpu.load.join('، ')}
━━━━━━━━━━━━━━━━━━━
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'system_info' }],
          [{ text: '🔙 برگشت', callback_data: 'system_menu' }]
        ]
      }
    };

    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
  } catch (error) {
    await ctx.editMessageText('❌ خطا! نتونستم اطلاعات رو بگیرم.');
  }
});

// حافظه
composer.callbackQuery('system_memory', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText('🔄 یه لحظه صبر کن...');

  try {
    const info = await systemService.getSystemInfo();
    
    const memBar = createProgressBar(parseFloat(info.memory.usagePercent), 20);
    
    const message = `
💾 **وضعیت حافظه**
━━━━━━━━━━━━━━━━━━━
${memBar} ${info.memory.usagePercent}%

📦 **کل:** ${info.memory.total}
🔄 **مصرف:** ${info.memory.used}
📤 **آزاد:** ${info.memory.free}
━━━━━━━━━━━━━━━━━━━
    `;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 بروزرسانی', callback_data: 'system_memory' }],
          [{ text: '🔙 برگشت', callback_data: 'system_menu' }]
        ]
      }
    };

    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
  } catch (error) {
    await ctx.editMessageText('❌ خطا! نتونستم اطلاعات رو بگیرم.');
  }
});

function createProgressBar(percent, length = 20) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default composer;