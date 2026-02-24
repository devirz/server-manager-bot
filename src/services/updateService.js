import { exec } from 'child_process';
import util from 'util';
import logger from '../utils/logger.js';
import commandService from './commandService.js';

const execPromise = util.promisify(exec);

export class UpdateService {
  async checkUpdates() {
    try {
      // آپدیت لیست پکیج‌ها
      await execPromise('sudo apt-get update');
      
      // بررسی آپدیت‌های قابل نصب
      const { stdout } = await execPromise('sudo apt-get upgrade --dry-run | grep "Inst "');
      
      const updates = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const match = line.match(/Inst\s+(\S+)\s+\[(.*?)\]\s+\((.*?)\)/);
          if (match) {
            return {
              package: match[1],
              currentVersion: match[2],
              newVersion: match[3]
            };
          }
          return null;
        })
        .filter(update => update !== null);

      return {
        success: true,
        count: updates.length,
        updates
      };
    } catch (error) {
      logger.error(`Failed to check updates: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async performUpdate(options = {}) {
    const {
      type = 'safe', // 'safe', 'full', 'dist-upgrade'
      autoApprove = false
    } = options;

    try {
      await execPromise('sudo apt-get update');

      let command = 'sudo apt-get';
      switch (type) {
        case 'safe':
          command += ' upgrade';
          break;
        case 'full':
          command += ' full-upgrade';
          break;
        case 'dist-upgrade':
          command += ' dist-upgrade';
          break;
        default:
          command += ' upgrade';
      }

      if (!autoApprove) {
        command += ' -s'; // dry-run mode
      } else {
        command += ' -y';
      }

      const result = await commandService.executeLongRunningCommand(command, (data) => {
        logger.info(`Update output: ${data}`);
      });

      return {
        success: result.code === 0,
        type,
        autoApprove,
        message: `Update ${result.code === 0 ? 'completed' : 'failed'}`
      };
    } catch (error) {
      logger.error(`Update failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async installPackage(packageName, options = {}) {
    const { autoApprove = false } = options;

    try {
      // بررسی وجود پکیج
      const { stdout: checkOutput } = await execPromise(`dpkg -l | grep -E "^ii\s+${packageName}" || true`);
      
      if (checkOutput.includes(packageName)) {
        return { success: false, error: 'Package already installed' };
      }

      // آپدیت لیست پکیج‌ها
      await execPromise('sudo apt-get update');

      // نصب پکیج
      const command = `sudo apt-get install ${packageName} ${autoApprove ? '-y' : '-s'}`;
      
      const result = await commandService.executeLongRunningCommand(command, (data) => {
        logger.info(`Install output: ${data}`);
      });

      logger.info(`Package ${packageName} installed successfully`);

      return {
        success: result.code === 0,
        package: packageName,
        message: `Package ${packageName} ${result.code === 0 ? 'installed' : 'installation failed'}`
      };
    } catch (error) {
      logger.error(`Package installation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async removePackage(packageName, options = {}) {
    const { purge = false, autoApprove = false } = options;

    try {
      const command = `sudo apt-get ${purge ? 'purge' : 'remove'} ${packageName} ${autoApprove ? '-y' : '-s'}`;
      
      const result = await commandService.executeLongRunningCommand(command, (data) => {
        logger.info(`Remove output: ${data}`);
      });

      logger.info(`Package ${packageName} removed successfully`);

      return {
        success: result.code === 0,
        package: packageName,
        purge,
        message: `Package ${packageName} ${result.code === 0 ? 'removed' : 'removal failed'}`
      };
    } catch (error) {
      logger.error(`Package removal failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async searchPackages(query) {
    try {
      const { stdout } = await execPromise(`apt-cache search "${query}" | head -30`);
      
      const packages = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [name, ...description] = line.split(' - ');
          return {
            name: name.trim(),
            description: description.join(' - ').trim()
          };
        });

      return {
        success: true,
        count: packages.length,
        packages
      };
    } catch (error) {
      logger.error(`Package search failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new UpdateService();