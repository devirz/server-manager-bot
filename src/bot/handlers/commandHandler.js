import { Composer } from 'grammy';
// import commandService from '../../services/commandservice.js';
// import commandService from '../../services/commandService.js';
import { Validator } from '../../utils/validator.js';
import logger from '../../utils/logger.js';
import commandService from '../../services/commandService.js';

const composer = new Composer();

composer.command('start', async (ctx) => {
  const welcomeMessage = `
🚀 **ربات مدیریت سرور اوبونتو**

دستورات موجود:
/help - راهنما
/system - اطلاعات سیستم
/disk - اطلاعات دیسک
/ps - لیست پردازش‌ها
/execute [command] - اجرای دستور

⚠️ **توجه**: فقط کاربران مجاز می‌توانند از این ربات استفاده کنند
  `;
  
  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

composer.command('help', async (ctx) => {
  const helpMessage = `
📚 **راهنمای دستورات**

**دستورات پایه:**
/start - شروع کار با ربات
/help - نمایش این راهنما

**دستورات سیستم:**
/system - اطلاعات سیستم
/disk - نمایش فضای دیسک
/ps - مدیریت فرآیندها
/load - نمایش بار سیستم
/uptime - نمایش زمان روشن بودن

**📊 مانیتورینگ لحظه‌ای:**
/monitor - نمایش وضعیت لحظه‌ای سرور
  • CPU, RAM, Disk, Network
  • تاریخچه مصرف
  • پردازش‌های پرمصرف
  • تنظیم آستانه هشدار

**🔒 مدیریت فایروال:**
/firewall - مدیریت فایروال UFW
  • فعال/غیرفعال کردن
  • مدیریت پورت‌ها
  • مدیریت IPها
  • مشاهده قوانین
  • پشتیبان‌گیری

**مدیریت کاربران:**
/users - مدیریت کاربران سیستم
/createuser - ایجاد کاربر جدید
/deleteuser - حذف کاربر
/chpass - تغییر رمز کاربر
/userinfo - اطلاعات کاربر

**پشتیبان‌گیری:**
/backup - ایجاد و مدیریت بکاپ

**آپدیت و پکیج‌ها:**
/update - مدیریت آپدیت سیستم
/install - نصب پکیج
/search - جستجوی پکیج

**اجرای دستور:**
/execute [command] - اجرای دستور دلخواه

⚠️ **نکات امنیتی:**
• تمام دستورات لاگ می‌شوند
• دستورات خطرناک مسدود شده‌اند
• فقط کاربران مجاز دسترسی دارند
  `;
  
  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

composer.command('execute', async (ctx) => {
  const command = ctx.match;
  
  if (!command) {
    await ctx.reply('❌ لطفاً یک دستور وارد کنید\nمثال: /execute ls -la');
    return;
  }

  if (!Validator.isValidCommand(command)) {
    await ctx.reply('⛔ دستور وارد شده مجاز نیست یا حاوی کاراکترهای خطرناک است');
    return;
  }

  const sanitizedCommand = Validator.sanitizeCommand(command);
  
  await ctx.reply(`⚙️ در حال اجرا: \`${sanitizedCommand}\``, { parse_mode: 'Markdown' });

  try {
    const result = await commandService.executeCommand(sanitizedCommand);
    
    if (result.success) {
      let output = result.output;
      if (output.length > 4000) {
        output = output.substring(0, 4000) + '\n\n... (خروجی بیش از حد طولانی است)';
      }
      
      await ctx.reply(`✅ **نتیجه:**\n\`\`\`\n${output}\n\`\`\``, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply(`❌ **خطا:**\n\`\`\`\n${result.error}\n\`\`\``, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    logger.error(`Error in execute command: ${error.message}`);
    await ctx.reply('❌ خطا در اجرای دستور');
  }
});

export default composer;