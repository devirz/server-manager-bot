import config from '../config/config.js';

export class Validator {
  static isAuthorized(userId) {
    const { adminIds, allowedUsers } = config.bot;
    return adminIds.includes(userId) || allowedUsers.includes(userId);
  }

  static isValidCommand(command) {
    if (!command || command.length > config.security.maxCommandLength) {
      return false;
    }

    const lowerCommand = command.toLowerCase();
    return !config.security.blockedCommands.some(blocked => 
      lowerCommand.includes(blocked.toLowerCase())
    );
  }

  static sanitizeCommand(command) {
    return command.replace(/[;&|`$]/g, '');
  }
}

export default Validator;