import { Composer } from 'grammy';
import userService from '../../services/userManagementService.js';

const composer = new Composer();

// دستور /users
composer.command('users', async (ctx) => {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📋 لیست کاربران', callback_data: 'users_list' },
          { text: '➕ ایجاد کاربر', callback_data: 'users_create' }
        ],
        [
          { text: '❌ حذف کاربر', callback_data: 'users_delete' },
          { text: '🔑 تغییر رمز', callback_data: 'users_password' }
        ],
        [
          { text: 'ℹ️ اطلاعات کاربر', callback_data: 'users_info' }
        ]
      ]
    }
  };

  await ctx.reply('👥 **مدیریت کاربران سیستم**\n\nیکی از گزینه‌های زیر را انتخاب کنید:', {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// هندلر کالبک برای مدیریت کاربران
composer.callbackQuery(/^users_(.+)$/, async (ctx) => {
  const action = ctx.match[1];
  
  await ctx.answerCallbackQuery();

  switch (action) {
    case 'list':
      await handleListUsers(ctx);
      break;
    case 'create':
      await ctx.reply('👤 برای ایجاد کاربر جدید، دستور زیر را وارد کنید:\n`/createuser username [password] [shell]`', {
        parse_mode: 'Markdown'
      });
      break;
    case 'delete':
      await ctx.reply('❌ برای حذف کاربر، دستور زیر را وارد کنید:\n`/deleteuser username [--remove-home]`', {
        parse_mode: 'Markdown'
      });
      break;
    case 'password':
      await ctx.reply('🔑 برای تغییر رمز کاربر، دستور زیر را وارد کنید:\n`/chpass username newpassword`', {
        parse_mode: 'Markdown'
      });
      break;
    case 'info':
      await ctx.reply('ℹ️ برای مشاهده اطلاعات کاربر، دستور زیر را وارد کنید:\n`/userinfo username`', {
        parse_mode: 'Markdown'
      });
      break;
  }
});

// دستور /createuser
composer.command('createuser', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const username = args[0];
  
  if (!username) {
    await ctx.reply('❌ لطفاً نام کاربری را وارد کنید\nمثال: `/createuser john`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const password = args[1];
  const shell = args[2] || '/bin/bash';

  await ctx.reply(`🔄 در حال ایجاد کاربر ${username}...`);

  const result = await userService.createUser(username, {
    password,
    shell,
    createHome: true
  });

  if (result.success) {
    await ctx.reply(`✅ ${result.message}`);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

// دستور /deleteuser
composer.command('deleteuser', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const username = args[0];
  
  if (!username) {
    await ctx.reply('❌ لطفاً نام کاربری را وارد کنید\nمثال: `/deleteuser john`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const removeHome = args.includes('--remove-home');

  // تاییدیه حذف
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ بله، حذف شود', callback_data: `confirm_delete_${username}_${removeHome}` },
          { text: '❌ انصراف', callback_data: 'cancel_delete' }
        ]
      ]
    }
  };

  await ctx.reply(`⚠️ **آیا از حذف کاربر ${username} اطمینان دارید؟**\n${removeHome ? '🏠 همراه با پوشه خانگی' : ''}`, {
    parse_mode: 'Markdown',
    ...keyboard
  });
});

// تایید حذف کاربر
composer.callbackQuery(/^confirm_delete_(.+)_(true|false)$/, async (ctx) => {
  const username = ctx.match[1];
  const removeHome = ctx.match[2] === 'true';
  
  await ctx.answerCallbackQuery();
  await ctx.reply(`🔄 در حال حذف کاربر ${username}...`);

  const result = await userService.deleteUser(username, { removeHome });

  if (result.success) {
    await ctx.reply(`✅ ${result.message}`);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

composer.callbackQuery('cancel_delete', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('✅ عملیات حذف لغو شد');
});

// دستور /chpass
composer.command('chpass', async (ctx) => {
  const args = ctx.match?.split(' ') || [];
  const username = args[0];
  const password = args[1];
  
  if (!username || !password) {
    await ctx.reply('❌ لطفاً نام کاربری و رمز جدید را وارد کنید\nمثال: `/chpass john newpass123`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  await ctx.reply(`🔄 در حال تغییر رمز کاربر ${username}...`);

  const result = await userService.changePassword(username, password);

  if (result.success) {
    await ctx.reply(`✅ ${result.message}`);
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

// دستور /userinfo
composer.command('userinfo', async (ctx) => {
  const username = ctx.match?.trim();
  
  if (!username) {
    await ctx.reply('❌ لطفاً نام کاربری را وارد کنید\nمثال: `/userinfo john`', {
      parse_mode: 'Markdown'
    });
    return;
  }

  await ctx.reply(`🔄 در حال دریافت اطلاعات کاربر ${username}...`);

  const result = await userService.getUserInfo(username);

  if (result.success) {
    const message = `
**ℹ️ اطلاعات کاربر ${username}**

🆔 UID: ${result.uid}
👥 گروه‌ها: ${result.groups}
📂 آخرین ورود: ${result.lastLogin}
    `;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
});

async function handleListUsers(ctx) {
  await ctx.reply('🔄 در حال دریافت لیست کاربران...');

  const result = await userService.listUsers();

  if (result.success) {
    let message = `**📋 لیست کاربران (${result.count} کاربر)**\n\n`;
    
    result.users.forEach(user => {
      const icon = user.isRoot ? '👑' : (user.isSystemUser ? '⚙️' : '👤');
      message += `${icon} \`${user.username}\` (UID: ${user.uid})\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(`❌ خطا: ${result.error}`);
  }
}

export default composer;