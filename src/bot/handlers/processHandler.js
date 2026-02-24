import { Composer } from 'grammy';
import processService from '../../services/processService.js';

const composer = new Composer();

// دستور /ps (پیشرفته)
composer.command('ps', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const filter = args[0] || 'all';

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 همه', callback_data: 'ps_all' },
          { text: '⚡ پرمصرف (CPU)', callback_data: 'ps_cpu' },
          { text: '💾 پرمصرف (RAM)', callback_data: 'ps_memory' }
        ],
        [
          { text: '👤 کاربری', callback_data: 'ps_user' },
          { text: '🔄 بار سیستم', callback_data: 'ps_load' }
        ]
      ]
    }
  };

  await ctx.reply('📋 **مدیریت فرآیندها**\n\nیکی از گزینه‌های زیر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// هندلر کالبک برای فرآیندها
composer.callbackQuery(/^ps_(.+)$/, async (ctx) => {
  const filter = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال دریافت لیست فرآیندها (${filter})...`);

  const result = await processService.listProcesses(filter);

  if (result.success) {
    let message = `**📋 لیست فرآیندها (${result.count} مورد)**\n\n`;
    
    result.processes.slice(0, 15).forEach(p => {
      message += `📌 \`${p.pid}\` ${p.user} | CPU: ${p.cpu}% | RAM: ${p.mem}%\n`;
      message += `   \`${p.command.substring(0, 50)}${p.command.length > 50 ? '...' : ''}\`\n\n`;
    });

    if (result.count > 15) {
      message += `... و ${result.count - 15} فرآیند دیگر`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

// دستور /kill
composer.command('kill', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const pid = parseInt(args[0]);
  const signal = args[1] || 'SIGTERM';

  if (!pid || isNaN(pid)) {
    await ctx.reply('❌ لطفاً PID معتبر وارد کنید\nمثال: `/kill 1234` یا `/kill 1234 SIGKILL`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  // دریافت اطلاعات فرآیند قبل از کشتن
  const info = await processService.getProcessInfo(pid);

  if (!info.success) {
    await ctx.reply(`❌ فرآیند با PID ${pid} یافت نشد`);
    return;
  }

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ بله، terminate', callback_data: `kill_${pid}_SIGTERM` },
          { text: '💥 kill -9', callback_data: `kill_${pid}_SIGKILL` },
          { text: '❌ انصراف', callback_data: 'kill_cancel' }
        ]
      ]
    }
  };

  await ctx.reply(
    `⚠️ **آیا از پایان دادن به فرآیند زیر اطمینان دارید؟**\n\n` +
    `📌 PID: ${info.pid}\n` +
    `👤 User: ${info.user}\n` +
    `📋 Command: ${info.command.substring(0, 100)}`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// تایید kill
composer.callbackQuery(/^kill_(\d+)_(.+)$/, async (ctx) => {
  const pid = parseInt(ctx.match[1]);
  const signal = ctx.match[2];
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال ارسال سیگنال ${signal} به فرآیند ${pid}...`);

  const result = await processService.killProcess(pid, signal);

  if (result.success) {
    await ctx.reply(`✅ ${result.message}`);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

composer.callbackQuery('kill_cancel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ عملیات لغو شد');
});

// دستور /load
composer.command('load', async (ctx) => {
  await ctx.reply('🔄 در حال دریافت بار سیستم...');

  const result = await processService.getSystemLoad();

  if (result.success) {
    const message = `
**📊 بار سیستم**

⚡ 1 دقیقه: ${result.loadAverage['1min']}
⚡ 5 دقیقه: ${result.loadAverage['5min']}
⚡ 15 دقیقه: ${result.loadAverage['15min']}

\`\`\`
${result.top}
\`\`\`
    `;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

export default composer;