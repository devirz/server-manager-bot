import { Composer } from 'grammy';
import firewallService from '../../services/firewallService.js';

const composer = new Composer();

// منوی فایروال
composer.callbackQuery('firewall_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const isInstalled = await firewallService.checkUFW();
  
  if (!isInstalled) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📦 نصب فایروال', callback_data: 'firewall_install' }],
          [{ text: '🔙 برگشت به منو', callback_data: 'back_to_main' }]
        ]
      }
    };
    
    await ctx.editMessageText(
      '🔒 **فایروال نصب نیست!**\n\n' +
      'برای مدیریت فایروال، اول باید نصبش کنی.',
      { parse_mode: 'Markdown', ...keyboard }
    );
    return;
  }

  const status = await firewallService.getStatus();
  const statusText = status.active ? '✅ فعال' : '❌ غیرفعال';
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 وضعیت', callback_data: 'firewall_status' },
          { text: status.active ? '🛑 خاموش کردن' : '✅ روشن کردن', 
            callback_data: status.active ? 'firewall_disable' : 'firewall_enable' }
        ],
        [
          { text: '➕ باز کردن پورت', callback_data: 'firewall_allow_port' },
          { text: '➖ بستن پورت', callback_data: 'firewall_deny_port' }
        ],
        [
          { text: '🌐 اجازه به IP', callback_data: 'firewall_allow_ip' },
          { text: '🚫 مسدود IP', callback_data: 'firewall_deny_ip' }
        ],
        [
          { text: '📋 لیست قوانین', callback_data: 'firewall_rules' },
          { text: '🗑️ حذف قانون', callback_data: 'firewall_delete' }
        ],
        [
          { text: '⚡ سرویس‌ها', callback_data: 'firewall_services' },
          { text: '💾 پشتیبان', callback_data: 'firewall_backup' }
        ],
        [{ text: '🔙 برگشت به منو', callback_data: 'back_to_main' }]
      ]
    }
  };

  await ctx.editMessageText(
    `🔒 **مدیریت فایروال**\n` +
    `━━━━━━━━━━━━━━━━━━━\n\n` +
    `وضعیت: ${statusText}\n\n` +
    `هرکاری می‌خوای انجام بدم؟`,
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// وضعیت فایروال
composer.callbackQuery('firewall_status', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const status = await firewallService.getStatus();
  
  if (!status.success) {
    await ctx.reply('❌ خطا! نتونستم وضعیت رو بگیرم.');
    return;
  }

  let message = `📋 **وضعیت فایروال**\n`;
  message += `━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `وضعیت: ${status.active ? '✅ فعال' : '❌ غیرفعال'}\n\n`;
  
  if (status.rules.length > 0) {
    message += '**قوانین:**\n';
    status.rules.forEach(rule => {
      message += `• ${rule.rule}\n`;
    });
  } else {
    message += 'هیچ قانونی تعریف نشده.';
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 بروزرسانی', callback_data: 'firewall_status' }],
        [{ text: '🔙 برگشت', callback_data: 'firewall_menu' }]
      ]
    }
  };

  await ctx.editMessageText(message, { ...keyboard });
});

// باز کردن پورت
composer.callbackQuery('firewall_allow_port', async (ctx) => {
  await ctx.answerCallbackQuery();
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌐 HTTP (80)', callback_data: 'firewall_allow_80_tcp' },
          { text: '🔒 HTTPS (443)', callback_data: 'firewall_allow_443_tcp' }
        ],
        [
          { text: '📧 SSH (22)', callback_data: 'firewall_allow_22_tcp' },
          { text: '🗄 MySQL (3306)', callback_data: 'firewall_allow_3306_tcp' }
        ],
        [
          { text: '🎮 بازی (25565)', callback_data: 'firewall_allow_25565_tcp' },
          { text: '📬 DNS (53)', callback_data: 'firewall_allow_53_udp' }
        ],
        [{ text: '✏️ پورت دلخواه', callback_data: 'firewall_custom_port' }],
        [{ text: '🔙 برگشت', callback_data: 'firewall_menu' }]
      ]
    }
  };

  await ctx.editMessageText(
    '➕ **باز کردن پورت**\n\n' +
    'پورتی رو می‌خوای باز کنم انتخاب کن:',
    { ...keyboard }
  );
});

// باز کردن پورت‌های پرکاربرد
composer.callbackQuery(/^firewall_allow_(\d+)_(\w+)$/, async (ctx) => {
  const port = ctx.match[1];
  const protocol = ctx.match[2];
  
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`🔄 دارم پورت ${port} رو باز می‌کنم...`);

  const result = await firewallService.allowPort(port, protocol, `باز شده توسط ربات`);
  
  if (result.success) {
    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 برگشت به منوی پورت', callback_data: 'firewall_allow_port' }]
        ]
      }
    };
    await ctx.editMessageText(`✅ پورت ${port} با موفقیت باز شد!`, { ...keyboard });
  } else {
    await ctx.editMessageText(`❌ خطا: ${result.error}`);
  }
});

// پورت دلخواه
composer.callbackQuery('firewall_custom_port', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    '✏️ **پورت دلخواه**\n\n' +
    'لطفاً شماره پورت رو به این شکل بفرست:\n' +
    'مثال: `8080 tcp` یا `53 udp`'
  );
  ctx.session = { action: 'allow_port' };
});

// گرفتن متن برای پورت دلخواه
composer.on('message:text', async (ctx) => {
  if (!ctx.session?.action) return;

  const action = ctx.session.action;
  const input = ctx.message.text.trim();

  if (action === 'allow_port') {
    const [port, protocol = 'tcp'] = input.split(' ');
    
    if (!port || isNaN(port)) {
      await ctx.reply('❌ لطفاً یه پورت معتبر بفرست!');
      return;
    }

    await ctx.reply(`🔄 دارم پورت ${port} رو باز می‌کنم...`);
    
    const result = await firewallService.allowPort(port, protocol, `باز شده توسط ربات`);
    
    if (result.success) {
      await ctx.reply(`✅ پورت ${port} با موفقیت باز شد!`);
    } else {
      await ctx.reply(`❌ خطا: ${result.error}`);
    }
    
    ctx.session = null;
  }
});

export default composer;