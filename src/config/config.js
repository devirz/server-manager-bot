import dotenv from 'dotenv';
dotenv.config();

export const config = {
  bot: {
    token: process.env.BOT_TOKEN,
    adminIds: process.env.ADMIN_IDS?.split(',').map(id => parseInt(id)) || [],
    allowedUsers: process.env.ALLOWED_USERS?.split(',').map(id => parseInt(id)) || [],
    maxCommandTimeout: parseInt(process.env.MAX_COMMAND_TIMEOUT) || 30000
  },
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  security: {
    maxCommandLength: 1000,
    blockedCommands: ['rm -rf', 'shutdown', 'reboot', 'halt', 'poweroff'],
    allowedCommands: ['ls', 'pwd', 'whoami', 'df -h', 'free -h', 'top -bn1', 'ps aux']
  }
};

export default config;