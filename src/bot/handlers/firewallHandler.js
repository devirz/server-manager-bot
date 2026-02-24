import { Composer } from 'grammy';
import firewallService from '../../services/firewallService.js';

const composer = new Composer();

// دستور /firewall
composer.command('firewall', async (ctx) => {
  // بررسی نصب بودن UFW
  const isInstalled = await firewallService.checkUFW();
  
  if (!isInstalled) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 نصب UFW', callback_data: 'firewall_install' }]
        ]
      }
    };
    
    await ctx.reply('🔒 **UFW نصب نیست**\n\nبرای مدیریت فایروال، لطفاً ابتدا UFW را نصب کنید.', {
      parse_mode: 'Markdown',
      ...keyboard
    });
    return;
  }

  const status = await firewallService.getStatus();
  
  const statusIcon = status.active ? '✅ فعال' : '❌ غیرفعال';
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 وضعیت', callback_data: 'firewall_status' },
          { text: status.active ? '🛑 غیرفعال' : '✅ فعال', callback_data: status.active ? 'firewall_disable' : 'firewall_enable' }
        ],
        [
          { text: '➕ اجازه پورت', callback_data: 'firewall_allow_port' },
          { text: '➖ مسدود پورت', callback_data: 'firewall_deny_port' }
        ],
        [
          { text: '🌐 اجازه IP', callback_data: 'firewall_allow_ip' },
          { text: '🚫 مسدود IP', callback_data: 'firewall_deny_ip' }
        ],
        [
          { text: '📋 قوانین', callback_data: 'firewall_rules' },
          { text: '🗑️ حذف قانون', callback_data: 'firewall_delete' }
        ],
        [
          { text: '🔧 پیش‌فرض‌ها', callback_data: 'firewall_defaults' },
          { text: '⚡ سرویس‌ها', callback_data: 'firewall_services' }
        ],
        [
          { text: '🔄 بازنشانی', callback_data: 'firewall_reset' },
          { text: '💾 پشتیبان', callback_data: 'firewall_backup' }
        ]
      ]
    }
  };

  await ctx.reply(`🔒 **مدیریت فایروال (UFW)**\n\nوضعیت: ${statusIcon}`, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// هندلر کالبک برای فایروال
composer.callbackQuery(/^firewall_(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  
  await ctx.answerCallbackQuery();

  try {
    switch (action) {
      case 'install':
        await handleInstall(ctx);
        break;
      case 'status':
        await handleStatus(ctx);
        break;
      case 'enable':
        await handleEnable(ctx);
        break;
      case 'disable':
        await handleDisable(ctx);
        break;
      case 'allow_port':
        await ctx.reply('➕ **اجازه پورت**\n\nلطفاً شماره پورت را وارد کنید:\nمثال: `80 tcp` یا `53 udp`', {
          parse_mode: 'Markdown'
        });
        ctx.session = { action: 'allow_port' };
        break;
      case 'deny_port':
        await ctx.reply('➖ **مسدود پورت**\n\nلطفاً شماره پورت را وارد کنید:\nمثال: `80 tcp` یا `53 udp`', {
          parse_mode: 'Markdown'
        });
        ctx.session = { action: 'deny_port' };
        break;
      case 'allow_ip':
        await ctx.reply('🌐 **اجازه IP**\n\nلطفاً آدرس IP را وارد کنید:\nمثال: `192.168.1.100`', {
          parse_mode: 'Markdown'
        });
        ctx.session = { action: 'allow_ip' };
        break;
      case 'deny_ip':
        await ctx.reply('🚫 **مسدود IP**\n\nلطفاً آدرس IP را وارد کنید:\nمثال: `192.168.1.100`', {
          parse_mode: 'Markdown'
        });
        ctx.session = { action: 'deny_ip' };
        break;
      case 'rules':
        await handleRules(ctx);
        break;
      case 'delete':
        await handleDeletePrompt(ctx);
        break;
      case 'defaults':
        await handleDefaults(ctx);
        break;
      case 'services':
        await handleServices(ctx);
        break;
      case 'reset':
        await handleReset(ctx);
        break;
      case 'backup':
        await handleBackup(ctx);
        break;
    }
  } catch (error) {
    await ctx.reply(`❌ خطا: ${error.message}`);
  }
});

// هندلر متن برای دریافت اطلاعات پورت و IP
composer.on('message:text', async (ctx) => {
  if (!ctx.session?.action) return;

  const action = ctx.session.action;
  const input = ctx.message.text.trim();

  try {
    switch (action) {
      case 'allow_port':
        await handleAllowPort(ctx, input);
        break;
      case 'deny_port':
        await handleDenyPort(ctx, input);
        break;
      case 'allow_ip':
        await handleAllowIP(ctx, input);
        break;
      case 'deny_ip':
        await handleDenyIP(ctx, input);
        break;
    }
    
    // پاک کردن session
    ctx.session = null;
  } catch (error) {
    await ctx.reply(`❌ خطا: ${error.message}`);
  }
});

async function handleInstall(ctx) {
  await ctx.reply('🔄 در حال نصب UFW...');
  
  const result = await firewallService.installUFW();
  
  if (result.success) {
    await ctx.reply(result.message);
    // فعال‌سازی پیش‌فرض SSH
    await firewallService.allowSSH();
    await ctx.reply('✅ پورت SSH (22) برای اتصال مجاز شد');
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handleStatus(ctx) {
  const status = await firewallService.getStatus();
  
  if (!status.success) {
    await ctx.reply(`❌ خطا: ${status.error}`);
    return;
  }

  let message = `**📋 وضعیت فایروال**\n\n`;
  message += `وضعیت: ${status.active ? '✅ فعال' : '❌ غیرفعال'}\n\n`;
  
  if (status.rules.length > 0) {
    message += '**قوانین:**\n';
    status.rules.forEach(rule => {
      message += `• ${rule.rule}\n`;
    });
  } else {
    message += 'هیچ قانونی تعریف نشده';
  }

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

async function handleEnable(ctx) {
  await ctx.reply('🔄 در حال فعال‌سازی فایروال...');
  
  const result = await firewallService.enable();
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handleDisable(ctx) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ بله، غیرفعال کن', callback_data: 'firewall_confirm_disable' },
          { text: '❌ انصراف', callback_data: 'firewall_cancel' }
        ]
      ]
    }
  };

  await ctx.reply('⚠️ **آیا از غیرفعال کردن فایروال اطمینان دارید؟**\nاین کار امنیت سرور را کاهش می‌دهد.', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

composer.callbackQuery('firewall_confirm_disable', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('🔄 در حال غیرفعال‌سازی فایروال...');
  
  const result = await firewallService.disable();
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

async function handleAllowPort(ctx, input) {
  const [port, protocol = 'tcp'] = input.split(' ');
  
  if (!port || isNaN(port)) {
    await ctx.reply('❌ لطفاً یک پورت معتبر وارد کنید');
    return;
  }

  await ctx.reply(`🔄 در حال مجاز کردن پورت ${port}/${protocol}...`);
  
  const result = await firewallService.allowPort(port, protocol, `Added by bot user ${ctx.from.id}`);
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handleDenyPort(ctx, input) {
  const [port, protocol = 'tcp'] = input.split(' ');
  
  if (!port || isNaN(port)) {
    await ctx.reply('❌ لطفاً یک پورت معتبر وارد کنید');
    return;
  }

  await ctx.reply(`🔄 در حال مسدود کردن پورت ${port}/${protocol}...`);
  
  const result = await firewallService.denyPort(port, protocol);
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handleAllowIP(ctx, input) {
  // اعتبارسنجی ساده IP
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(input)) {
    await ctx.reply('❌ لطفاً یک IP معتبر وارد کنید');
    return;
  }

  await ctx.reply(`🔄 در حال مجاز کردن IP ${input}...`);
  
  const result = await firewallService.allowIP(input, `Added by bot user ${ctx.from.id}`);
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handleDenyIP(ctx, input) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(input)) {
    await ctx.reply('❌ لطفاً یک IP معتبر وارد کنید');
    return;
  }

  await ctx.reply(`🔄 در حال مسدود کردن IP ${input}...`);
  
  const result = await firewallService.denyIP(input);
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handleRules(ctx) {
  const rules = await firewallService.getFirewallRules();
  
  if (!rules.success) {
    await ctx.reply(`❌ خطا: ${rules.error}`);
    return;
  }

  if (rules.rules.length === 0) {
    await ctx.reply('📋 هیچ قانونی تعریف نشده');
    return;
  }

  let message = '**📋 قوانین فایروال:**\n\n';
  rules.rules.forEach((rule, index) => {
    message += `${index + 1}. \`${rule}\`\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

async function handleDeletePrompt(ctx) {
  const status = await firewallService.getStatus();
  
  if (!status.success || status.rules.length === 0) {
    await ctx.reply('📋 هیچ قانونی برای حذف وجود ندارد');
    return;
  }

  // ساخت کیبورد داینامیک برای قوانین
  const keyboard = {
    reply_markup: {
      inline_keyboard: status.rules.map(rule => [
        { text: `❌ قانون ${rule.number}`, callback_data: `firewall_delete_${rule.number}` }
      ])
    }
  };

  await ctx.reply('🗑️ **حذف قانون**\n\nلطفاً قانون مورد نظر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

composer.callbackQuery(/^firewall_delete_(\d+)$/, async (ctx) => {
  const ruleNumber = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال حذف قانون شماره ${ruleNumber}...`);
  
  const result = await firewallService.deleteRule(ruleNumber);
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

async function handleDefaults(ctx) {
  const policies = await firewallService.getDefaultPolicy();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚫 Deny Incoming', callback_data: 'firewall_default_deny_incoming' }],
        [{ text: '✅ Allow Incoming', callback_data: 'firewall_default_allow_incoming' }],
        [{ text: '🔄 Deny Outgoing', callback_data: 'firewall_default_deny_outgoing' }],
        [{ text: '📤 Allow Outgoing', callback_data: 'firewall_default_allow_outgoing' }]
      ]
    }
  };

  await ctx.reply('🔧 **تنظیمات پیش‌فرض**\n\nسیاست پیش‌فرض را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

composer.callbackQuery(/^firewall_default_(.+)$/, async (ctx) => {
  const [policy, direction] = ctx.match[1].split('_');
  
  await ctx.answerCallbackQuery();
  
  const result = await firewallService.setDefaultPolicy(policy, direction);
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

async function handleServices(ctx) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 HTTP (80)', callback_data: 'firewall_service_http' },
          { text: '🔒 HTTPS (443)', callback_data: 'firewall_service_https' }
        ],
        [
          { text: '📧 SSH (22)', callback_data: 'firewall_service_ssh' },
          { text: '🗄 MySQL (3306)', callback_data: 'firewall_service_mysql' }
        ],
        [
          { text: '🐘 PostgreSQL (5432)', callback_data: 'firewall_service_postgres' },
          { text: '📬 SMTP (25)', callback_data: 'firewall_service_smtp' }
        ]
      ]
    }
  };

  await ctx.reply('⚡ **سرویس‌های پرکاربرد**\n\nیکی از سرویس‌ها را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

composer.callbackQuery(/^firewall_service_(.+)$/, async (ctx) => {
  const service = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  
  const servicePorts = {
    ssh: 22,
    http: 80,
    https: 443,
    mysql: 3306,
    postgres: 5432,
    smtp: 25
  };

  const port = servicePorts[service];
  
  if (!port) {
    await ctx.reply('❌ سرویس نامعتبر');
    return;
  }

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ اجازه', callback_data: `firewall_allow_service_${port}` },
          { text: '❌ مسدود', callback_data: `firewall_deny_service_${port}` }
        ]
      ]
    }
  };

  await ctx.reply(`⚡ **مدیریت سرویس ${service}**\n\nپورت: ${port}\n\nعملیات مورد نظر را انتخاب کنید:`, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

composer.callbackQuery(/^firewall_(allow|deny)_service_(\d+)$/, async (ctx) => {
  const action = ctx.match[1];
  const port = ctx.match[2];
  
  await ctx.answerCallbackQuery();
  
  let result;
  if (action === 'allow') {
    result = await firewallService.allowPort(port, 'tcp', `Service added by bot`);
  } else {
    result = await firewallService.denyPort(port, 'tcp');
  }
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

async function handleReset(ctx) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ بله، بازنشانی کن', callback_data: 'firewall_confirm_reset' },
          { text: '❌ انصراف', callback_data: 'firewall_cancel' }
        ]
      ]
    }
  };

  await ctx.reply('⚠️ **آیا از بازنشانی فایروال اطمینان دارید؟**\nهمه قوانین پاک خواهند شد.', {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

composer.callbackQuery('firewall_confirm_reset', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('🔄 در حال بازنشانی فایروال...');
  
  const result = await firewallService.reset();
  
  if (result.success) {
    await ctx.reply(result.message);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

async function handleBackup(ctx) {
  await ctx.reply('🔄 در حال پشتیبان‌گیری از قوانین...');
  
  const result = await firewallService.backupRules();
  
  if (result.success) {
    await ctx.replyWithDocument({
      source: result.path,
      filename: `ufw-backup-${Date.now()}.txt`
    }, {
      caption: '✅ پشتیبان قوانین فایروال'
    });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

composer.callbackQuery('firewall_cancel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ عملیات لغو شد');
});

export default composer;