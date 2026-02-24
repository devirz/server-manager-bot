import logger from '../utils/logger.js';

export class SecurityService {

  logActivity(userId, command, status) {
    logger.info({
      type: 'user_activity',
      userId,
      command,
      status,
      timestamp: new Date().toISOString()
    });
  }

  async validateAndSanitize(input) {
    let sanitized = input.replace(/[<>"']/g, '');
    
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000);
    }
    
    return sanitized;
  }
}

export default new SecurityService();