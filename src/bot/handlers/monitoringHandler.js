import { Composer } from 'grammy';
import monitoringService from '../../services/monitoringService.js';
import { performance } from 'perf_hooks';

const composer = new Composer();

// دستور /monitor
composer.command('monitor', async (ctx) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 لحظه‌ای', callback_data: 'monitor_realtime' },
          { text: '📈 تاریخچه CPU', callback_data: 'monitor_cpu_history' }
        ],
        [
          { text: '💾 تاریخچه RAM', callback_data: 'monitor_memory_history' },
          { text: '🌐 شبکه', callback_data: 'monitor_network' }
        ],
        [
          { text: '⚡ پردازش‌ها', callback_data: 'monitor_processes' },
          { text: '👥 کاربران', callback_data: 'monitor_users' }
        ],
        [
          { text: '⚙️ تنظیم آستانه', callback_data: 'monitor_thresholds' }
        ]
      ]
    }
  };

  await ctx.reply('📊 **مانیتورینگ لحظه‌ای سرور**\n\nیکی از گزینه‌های زیر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// هندلر کالبک برای مانیتورینگ
composer.callbackQuery(/^monitor_(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply('🔄 در حال دریافت اطلاعات...');

  try {
    switch (action) {
      case 'realtime':
        await handleRealtimeStats(ctx);
        break;
      case 'cpu_history':
        await handleCpuHistory(ctx);
        break;
      case 'memory_history':
        await handleMemoryHistory(ctx);
        break;
      case 'network':
        await handleNetworkStats(ctx);
        break;
      case 'processes':
        await handleTopProcesses(ctx);
        break;
      case 'users':
        await handleUsers(ctx);
        break;
      case 'thresholds':
        await handleThresholds(ctx);
        break;
    }
  } catch (error) {
    await ctx.reply(`❌ خطا: ${error.message}`);
  }
});

async function handleRealtimeStats(ctx) {
  const { stats, alerts } = await monitoringService.getRealTimeStats();

  // ایجاد نمودار ASCII برای CPU
  const cpuBar = createProgressBar(parseFloat(stats.cpu.currentLoad), 20);
  
  // ایجاد نمودار ASCII برای RAM
  const memBar = createProgressBar(parseFloat(stats.memory.usagePercent), 20);

  let message = `
**📊 وضعیت لحظه‌ای سرور**
⏱️ زمان: ${new Date(stats.timestamp).toLocaleTimeString('fa-IR')}

**⚡ پردازنده:**
${cpuBar} ${stats.cpu.currentLoad}%
📈 لود: ${stats.system.loadAvg.join(', ')}
🌡️ دما: ${stats.cpu.temperature}°C

**💾 حافظه:**
${memBar} ${stats.memory.usagePercent}%
📦 کل: ${stats.memory.total}
🔄 مصرف: ${stats.memory.used}
📤 سواپ: ${stats.memory.swapUsed}

**💽 دیسک:**
${stats.disk.map(d => 
  `📁 ${d.mount}: ${d.usePercent}% (${d.used}/${d.size})`
).join('\n')}

**🌐 شبکه:**
📥 دریافت: ${stats.network.rxSec}
📤 ارسال: ${stats.network.txSec}
🔌 اینترفیس: ${stats.network.interfaces.map(i => i.name).join(', ')}

**⚙️ پردازش‌ها:**
📊 کل: ${stats.processes.total}
▶️ در حال اجرا: ${stats.processes.running}
😴 در خواب: ${stats.processes.sleeping}

⏱️ آپتایم: ${stats.system.uptime}
  `;

  // اضافه کردن آلارم‌ها اگر وجود داشته باشند
  if (alerts.length > 0) {
    message += '\n\n**⚠️ هشدارها:**\n';
    alerts.forEach(alert => {
      message += `• ${alert.message}\n`;
    });
  }

  // دکمه به‌روزرسانی
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 به‌روزرسانی', callback_data: 'monitor_realtime' }]
      ]
    }
  };

  await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
}

async function handleCpuHistory(ctx) {
  const history = await monitoringService.getCpuHistory();
  
  if (history.length === 0) {
    await ctx.reply('📭 داده‌ای برای نمایش وجود ندارد');
    return;
  }

  // ایجاد نمودار ASCII
  const maxValue = Math.max(...history.map(h => h.cpu));
  const minValue = Math.min(...history.map(h => h.cpu));
  
  let message = `**📈 تاریخچه مصرف CPU (${history.length} نمونه)**\n`;
  message += `حداکثر: ${maxValue.toFixed(1)}% | حداقل: ${minValue.toFixed(1)}%\n\n`;

  // نمایش 10 نمونه آخر
  const recentHistory = history.slice(-10);
  recentHistory.forEach(item => {
    const bar = createProgressBar(item.cpu, 15);
    message += `${item.time}: ${bar} ${item.cpu.toFixed(1)}%\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

async function handleMemoryHistory(ctx) {
  const history = await monitoringService.getMemoryHistory();
  
  if (history.length === 0) {
    await ctx.reply('📭 داده‌ای برای نمایش وجود ندارد');
    return;
  }

  let message = `**📈 تاریخچه مصرف RAM (${history.length} نمونه)**\n\n`;

  // نمایش 10 نمونه آخر
  const recentHistory = history.slice(-10);
  recentHistory.forEach(item => {
    const bar = createProgressBar(item.memory, 15);
    message += `${item.time}: ${bar} ${item.memory.toFixed(1)}%\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

async function handleNetworkStats(ctx) {
  const stats = await monitoringService.getRealTimeStats();
  const network = stats.network;

  let message = `
**🌐 آمار شبکه**

**اینترفیس‌ها:**
${network.interfaces.map(i => 
  `• ${i.name}: ${i.address} (${i.mac})`
).join('\n')}

**ترافیک:**
📥 دریافت: ${network.rxSec}
📤 ارسال: ${network.txSec}

**کل:**
📥 کل دریافت: ${network.totalRx}
📤 کل ارسال: ${network.totalTx}
  `;

  // دریافت I/O دیسک اگر موجود باشد
  const diskIO = await monitoringService.getDiskIO();
  if (diskIO) {
    message += `

**💽 I/O دیسک:**
📖 خواندن: ${diskIO.rIO} ops
💾 نوشتن: ${diskIO.wIO} ops
⏱️ زمان I/O: ${diskIO.tIO} ms
    `;
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

async function handleTopProcesses(ctx) {
  const processes = await monitoringService.getTopProcesses(15);

  let message = '**⚡ پردازش‌های پرمصرف**\n\n';
  
  processes.forEach((p, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
    message += `${medal} \`${p.name}\`\n`;
    message += `   📊 CPU: ${p.cpu}% | RAM: ${p.mem} (${p.memPercent}%)\n`;
    message += `   👤 ${p.user} | PID: ${p.pid}\n`;
    if (p.command) {
      message += `   📋 ${p.command.substring(0, 50)}${p.command.length > 50 ? '...' : ''}\n`;
    }
    message += '\n';
  });

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 به‌روزرسانی', callback_data: 'monitor_processes' }]
      ]
    }
  };

  await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
}

async function handleUsers(ctx) {
  const users = await monitoringService.getUsers();

  if (!users || users.length === 0) {
    await ctx.reply('👥 هیچ کاربر فعالی یافت نشد');
    return;
  }

  let message = '**👥 کاربران فعال:**\n\n';
  
  users.forEach(user => {
    message += `👤 ${user.user}\n`;
    message += `   📍 از: ${user.from}\n`;
    message += `   ⏱️ ورود: ${user.time}\n`;
    if (user.ip) {
      message += `   🌐 IP: ${user.ip}\n`;
    }
    message += '\n';
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

async function handleThresholds(ctx) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚡ CPU', callback_data: 'threshold_cpu' }],
        [{ text: '💾 RAM', callback_data: 'threshold_memory' }],
        [{ text: '💽 دیسک', callback_data: 'threshold_disk' }],
        [{ text: '📊 Load', callback_data: 'threshold_load' }]
      ]
    }
  };

  await ctx.reply('⚙️ **تنظیم آستانه هشدار**\n\nمقدار مورد نظر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

// هندلر تنظیم آستانه‌ها
composer.callbackQuery(/^threshold_(.+)$/, async (ctx) => {
  const metric = ctx.match[1];
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '50%', callback_data: `set_threshold_${metric}_50` }],
        [{ text: '60%', callback_data: `set_threshold_${metric}_60` }],
        [{ text: '70%', callback_data: `set_threshold_${metric}_70` }],
        [{ text: '80%', callback_data: `set_threshold_${metric}_80` }],
        [{ text: '90%', callback_data: `set_threshold_${metric}_90` }]
      ]
    }
  };

  await ctx.answerCallbackQuery();
  await ctx.reply(`📊 **تنظیم آستانه برای ${metric}**\n\nمقدار جدید را انتخاب کنید:`, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

composer.callbackQuery(/^set_threshold_(.+)_(\d+)$/, async (ctx) => {
  const metric = ctx.match[1];
  const value = parseInt(ctx.match[2]);
  
  await ctx.answerCallbackQuery();
  
  const success = await monitoringService.setThreshold(metric, value);
  
  if (success) {
    await ctx.reply(`✅ آستانه ${metric} به ${value}% تغییر یافت`);
  } else {
    await ctx.reply(`❌ خطا در تنظیم آستانه`);
  }
});

function createProgressBar(percent, length = 20) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  
  const filledChar = '█';
  const emptyChar = '░';
  
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

export default composer;