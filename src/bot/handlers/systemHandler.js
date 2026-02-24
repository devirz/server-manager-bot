import { Composer } from 'grammy';
import systemService from '../../services/systemService.js';

const composer = new Composer();

composer.command('system', async (ctx) => {
  await ctx.reply('🔄 در حال دریافت اطلاعات سیستم...');

  try {
    const info = await systemService.getSystemInfo();
    
    const message = `
**📊 اطلاعات سیستم**

🖥 **میزبان:** ${info.hostname}
💻 **سیستم عامل:** ${info.platform} ${info.arch}
📀 **نسخه:** ${info.release}
⏱ **روشن بودن:** ${info.uptime}

**💾 حافظه:**
• کل: ${info.memory.total}
• استفاده شده: ${info.memory.used} (${info.memory.usagePercent}%)
• آزاد: ${info.memory.free}

**⚙️ پردازنده:**
• مدل: ${info.cpu.model}
• هسته‌ها: ${info.cpu.cores}
• بار: ${info.cpu.load.join(', ')}
    `;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ خطا در دریافت اطلاعات سیستم');
  }
});

composer.command('disk', async (ctx) => {
  await ctx.reply('🔄 در حال دریافت اطلاعات دیسک...');

  try {
    const result = await systemService.getDiskUsage();
    
    if (result.success) {
      await ctx.reply(`**💽 اطلاعات دیسک:**\n\`\`\`\n${result.output}\n\`\`\``, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ خطا در دریافت اطلاعات دیسک');
    }
  } catch (error) {
    await ctx.reply('❌ خطا در دریافت اطلاعات دیسک');
  }
});

composer.command('ps', async (ctx) => {
  await ctx.reply('🔄 در حال دریافت لیست پردازش‌ها...');

  try {
    const result = await systemService.getProcessList();
    
    if (result.success) {
      await ctx.reply(`**📋 ۲۰ پردازش برتر:**\n\`\`\`\n${result.output}\n\`\`\``, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ خطا در دریافت لیست پردازش‌ها');
    }
  } catch (error) {
    await ctx.reply('❌ خطا در دریافت لیست پردازش‌ها');
  }
});

composer.command('uptime', async (ctx) => {
  try {
    const info = await systemService.getSystemInfo();
    await ctx.reply(`⏱ **زمان روشن بودن:** ${info.uptime}`, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('❌ خطا در دریافت اطلاعات');
  }
});

export default composer;