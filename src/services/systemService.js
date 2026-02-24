import os from 'os';
import commandService from './commandService.js';
import logger from '../utils/logger.js';

export class SystemService {
  async getSystemInfo() {
    try {
      const uptime = os.uptime();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const cpus = os.cpus();

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: this.#formatUptime(uptime),
        memory: {
          total: this.#formatBytes(totalMem),
          free: this.#formatBytes(freeMem),
          used: this.#formatBytes(totalMem - freeMem),
          usagePercent: ((totalMem - freeMem) / totalMem * 100).toFixed(2)
        },
        cpu: {
          model: cpus[0].model,
          cores: cpus.length,
          load: os.loadavg()
        }
      };
    } catch (error) {
      logger.error(`Error getting system info: ${error.message}`);
      throw error;
    }
  }

  async getDiskUsage() {
    return await commandService.executeCommand('df -h');
  }

  async getProcessList() {
    return await commandService.executeCommand('ps aux --sort=-%cpu | head -20');
  }

  #formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  #formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

export default new SystemService();