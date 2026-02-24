import logger from '../../utils/logger.js';

export const loggingMiddleware = async (ctx, next) => {
  const start = Date.now();
  const user = ctx.from;
  const command = ctx.message?.text || 'unknown';

  logger.info({
    type: 'request',
    user: user?.username || user?.id,
    command,
    timestamp: new Date().toISOString()
  });

  await next();

  const ms = Date.now() - start;
  logger.info({
    type: 'response',
    user: user?.username || user?.id,
    duration: `${ms}ms`
  });
};

export default loggingMiddleware;