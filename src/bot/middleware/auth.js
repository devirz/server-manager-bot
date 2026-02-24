import { Validator } from '../../utils/validator.js';
import logger from '../../utils/logger.js';

export const authMiddleware = async (ctx, next) => {
  const userId = ctx.from?.id;
  
  if (!userId) {
    await ctx.reply('❌ خطا در شناسایی کاربر');
    return;
  }

  if (!Validator.isAuthorized(userId)) {
    logger.warn(`Unauthorized access attempt from user ${userId}`);
    await ctx.reply('⛔ شما مجاز به استفاده از این ربات نیستید');
    return;
  }

  if (!ctx.state) {
    ctx.state = {};
  }

  ctx.state.user = {
    id: userId,
    isAdmin: Validator.isAuthorized(userId)
  };

  await next();
};

export default authMiddleware;