import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

const execPromise = util.promisify(exec);

export class UserManagementService {
  async listUsers() {
    try {
      const { stdout } = await execPromise('cat /etc/passwd | grep -E ":/home|:/root" | cut -d: -f1,3,6,7');
      
      const users = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [username, uid, home, shell] = line.split(':');
          return {
            username,
            uid: parseInt(uid),
            home,
            shell,
            isSystemUser: parseInt(uid) < 1000,
            isRoot: uid === '0'
          };
        });

      return {
        success: true,
        users,
        count: users.length
      };
    } catch (error) {
      logger.error(`Failed to list users: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async createUser(username, options = {}) {
    const {
      password = null,
      createHome = true,
      shell = '/bin/bash',
      groups = []
    } = options;

    try {
      // بررسی وجود کاربر
      const { stdout: checkOutput } = await execPromise(`id ${username} 2>/dev/null && echo "exists" || echo "notexists"`);
      
      if (checkOutput.includes('exists')) {
        return { success: false, error: 'User already exists' };
      }

      // ساخت کاربر
      let command = `sudo useradd`;
      if (createHome) command += ' -m';
      if (shell) command += ` -s ${shell}`;
      if (groups.length > 0) command += ` -G ${groups.join(',')}`;
      command += ` ${username}`;

      await execPromise(command);

      // تنظیم پسورد اگر داده شده
      if (password) {
        await execPromise(`echo "${username}:${password}" | sudo chpasswd`);
      }

      logger.info(`User created successfully: ${username}`);
      
      return {
        success: true,
        username,
        message: `User ${username} created successfully`
      };
    } catch (error) {
      logger.error(`Failed to create user ${username}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async deleteUser(username, options = {}) {
    const { removeHome = false, force = false } = options;

    try {
      // محافظت از کاربر روت
      if (username === 'root') {
        return { success: false, error: 'Cannot delete root user' };
      }

      let command = 'sudo userdel';
      if (removeHome) command += ' -r';
      if (force) command += ' -f';
      command += ` ${username}`;

      await execPromise(command);
      
      logger.info(`User deleted successfully: ${username}`);
      
      return {
        success: true,
        username,
        message: `User ${username} deleted successfully`
      };
    } catch (error) {
      logger.error(`Failed to delete user ${username}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async changePassword(username, newPassword) {
    try {
      await execPromise(`echo "${username}:${newPassword}" | sudo chpasswd`);
      
      logger.info(`Password changed for user: ${username}`);
      
      return {
        success: true,
        message: `Password changed for ${username}`
      };
    } catch (error) {
      logger.error(`Failed to change password for ${username}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async addToGroup(username, group) {
    try {
      await execPromise(`sudo usermod -aG ${group} ${username}`);
      
      logger.info(`User ${username} added to group ${group}`);
      
      return {
        success: true,
        message: `User ${username} added to group ${group}`
      };
    } catch (error) {
      logger.error(`Failed to add user to group: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getUserInfo(username) {
    try {
      const { stdout: idOutput } = await execPromise(`id ${username}`);
      const { stdout: lastlogOutput } = await execPromise(`lastlog -u ${username} | tail -n 1`);
      
      // پارس کردن خروجی id
      const uidMatch = idOutput.match(/uid=(\d+)/);
      const gidMatch = idOutput.match(/gid=(\d+)/);
      const groupsMatch = idOutput.match(/groups=.*$/);

      return {
        success: true,
        username,
        uid: uidMatch ? parseInt(uidMatch[1]) : null,
        gid: gidMatch ? parseInt(gidMatch[1]) : null,
        groups: groupsMatch ? groupsMatch[0] : '',
        lastLogin: lastlogOutput.trim() || 'Never logged in'
      };
    } catch (error) {
      logger.error(`Failed to get user info: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new UserManagementService();