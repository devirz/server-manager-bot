import logger from '../../utils/logger.js';

export const errorHandlerMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // لاگ کردن خطا با جزئیات کامل
    logger.error({
      type: 'middleware_error',
      error: error.message,
      stack: error.stack,
      user: ctx.from?.id || 'unknown',
      chat: ctx.chat?.id || 'unknown',
      message: ctx.message?.text || 'unknown'
    });

    // چاپ خطا در کنسول برای دیباگ
    console.error('❌ Error in middleware:', error);
    console.error('Stack trace:', error.stack);

    // تلاش برای پاسخ به کاربر
    try {
      // بررسی نوع خطا و ارسال پیام مناسب
      if (error.message.includes('ETELEGRAM') || error.message.includes('network')) {
        await ctx.reply('🌐 خطای ارتباط با تلگرام. لطفاً دوباره تلاش کنید.');
      } else if (error.message.includes('timeout')) {
        await ctx.reply('⏱️ زمان اجرای دستور بیش از حد طولانی شد. لطفاً دوباره تلاش کنید.');
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        await ctx.reply('🔒 خطای دسترسی. شما مجوز اجرای این دستور را ندارید.');
      } else {
        await ctx.reply('❌ خطایی در پردازش درخواست رخ داد. لطفاً دوباره تلاش کنید.');
      }
    } catch (replyError) {
      // اگر حتی ارسال پیام خطا هم ناموفق بود
      logger.error(`Could not send error message: ${replyError.message}`);
    }
  }
};

// میدلور مدیریت خطاهای 404 (دستورات پیدا نشده)
export const notFoundHandler = async (ctx, next) => {
  // اگر دستور قبلاً پردازش نشده باشد
  if (!ctx.handled) {
    await ctx.reply('❌ دستور نامعتبر. برای مشاهده لیست دستورات /help را بزنید.');
  }
  await next();
};

// میدلور مدیریت خطاهای زمان اجرا
export const timeoutMiddleware = (timeout = 30000) => {
  return async (ctx, next) => {
    const timeoutId = setTimeout(() => {
      logger.warn(`Request timeout for user ${ctx.from?.id}`);
      ctx.reply('⏱️ زمان اجرای درخواست به پایان رسید.').catch(() => {});
    }, timeout);

    try {
      await next();
    } finally {
      clearTimeout(timeoutId);
    }
  };
};

export default errorHandlerMiddleware;