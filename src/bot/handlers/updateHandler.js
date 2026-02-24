import { Composer } from 'grammy';
import updateService from '../../services/updateService.js';

const composer = new Composer();

// دستور /update
composer.command('update', async (ctx) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔍 بررسی آپدیت‌ها', callback_data: 'update_check' },
          { text: '⬆️ آپدیت امن', callback_data: 'update_safe' }
        ],
        [
          { text: '📦 نصب پکیج', callback_data: 'update_install' },
          { text: '🔍 جستجوی پکیج', callback_data: 'update_search' }
        ],
        [
          { text: '📋 لیست پکیج‌ها', callback_data: 'update_list' }
        ]
      ]
    }
  };

  await ctx.reply('🔄 **مدیریت آپدیت و پکیج‌ها**\n\nیکی از گزینه‌های زیر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// هندلر کالبک برای آپدیت
composer.callbackQuery(/^update_(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  
  await ctx.answerCallbackQuery();

  switch (action) {
    case 'check':
      await handleCheckUpdates(ctx);
      break;
    case 'safe':
      await handlePerformUpdate(ctx, 'safe');
      break;
    case 'install':
      await ctx.reply('📦 برای نصب پکیج، دستور زیر را وارد کنید:\n`/install package-name`', {
        parse_mode: 'Markdown'
      });
      break;
    case 'search':
      await ctx.reply('🔍 برای جستجوی پکیج، دستور زیر را وارد کنید:\n`/search package-name`', {
        parse_mode: 'Markdown'
      });
      break;
    case 'list':
      await ctx.reply('📋 برای مشاهده پکیج‌های نصب شده:\n`/list-packages`', {
        parse_mode: 'Markdown'
      });
      break;
  }
});

async function handleCheckUpdates(ctx) {
  await ctx.reply('🔄 در حال بررسی آپدیت‌ها...');

  const result = await updateService.checkUpdates();

  if (result.success) {
    if (result.count === 0) {
      await ctx.reply('✅ سیستم شما به‌روز است!');
      return;
    }

    let message = `**📦 ${result.count} آپدیت موجود:**\n\n`;
    
    result.updates.slice(0, 10).forEach(update => {
      message += `📌 \`${update.package}\`\n`;
      message += `   ${update.currentVersion} → ${update.newVersion}\n\n`;
    });

    if (result.count > 10) {
      message += `... و ${result.count - 10} آپدیت دیگر`;
    }

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⬆️ آپدیت همه', callback_data: 'update_safe_confirm' },
            { text: '🔍 بررسی مجدد', callback_data: 'update_check' }
          ]
        ]
      }
    };

    await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

async function handlePerformUpdate(ctx, type) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ تایید', callback_data: `update_confirm_${type}` },
          { text: '❌ انصراف', callback_data: 'update_cancel' }
        ]
      ]
    }
  };

  await ctx.reply(`⚠️ **آیا از انجام آپدیت ${type === 'safe' ? 'امن' : 'کامل'} اطمینان دارید؟**`, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

composer.callbackQuery(/^update_confirm_(.+)$/, async (ctx) => {
  const type = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال انجام آپدیت... این عملیات ممکن است چند دقیقه طول بکشد`);

  const result = await updateService.performUpdate({
    type,
    autoApprove: true
  });

  if (result.success) {
    await ctx.reply(`✅ آپدیت با موفقیت انجام شد`);
  } else {
    await ctx.reply(`❌ خطا در آپدیت: ${result.error}`);
  }
});

composer.callbackQuery('update_cancel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ عملیات لغو شد');
});

// دستور /install
composer.command('install', async (ctx) => {
  const packageName = ctx.match?.trim();
  
  if (!packageName) {
    await ctx.reply('❌ لطفاً نام پکیج را وارد کنید\nمثال: `/install htop`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ نصب', callback_data: `install_confirm_${packageName}` },
          { text: '❌ انصراف', callback_data: 'install_cancel' }
        ]
      ]
    }
  };

  await ctx.reply(`📦 **آیا از نصب ${packageName} اطمینان دارید؟**`, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

composer.callbackQuery(/^install_confirm_(.+)$/, async (ctx) => {
  const packageName = ctx.match[1];
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال نصب ${packageName}...`);

  const result = await updateService.installPackage(packageName, {
    autoApprove: true
  });

  if (result.success) {
    await ctx.reply(`✅ ${result.message}`);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

composer.callbackQuery('install_cancel', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ عملیات لغو شد');
});

// دستور /search
composer.command('search', async (ctx) => {
  const query = ctx.match?.trim();
  
  if (!query) {
    await ctx.reply('❌ لطفاً عبارت جستجو را وارد کنید\nمثال: `/search nginx`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  await ctx.reply(`🔄 در حال جستجوی ${query}...`);

  const result = await updateService.searchPackages(query);

  if (result.success) {
    if (result.count === 0) {
      await ctx.reply('❌ هیچ پکیجی یافت نشد');
      return;
    }

    let message = `**📦 ${result.count} پکیج یافت شده:**\n\n`;
    
    result.packages.forEach(pkg => {
      message += `📌 \`${pkg.name}\`\n`;
      message += `   ${pkg.description.substring(0, 100)}${pkg.description.length > 100 ? '...' : ''}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

export default composer;