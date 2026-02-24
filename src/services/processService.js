import { exec } from 'child_process';
import util from 'util';
import logger from '../utils/logger.js';

const execPromise = util.promisify(exec);

export class ProcessService {
  async listProcesses(filter = 'all') {
    try {
      let command = 'ps aux';
      
      switch (filter) {
        case 'user':
          command = 'ps aux --user';
          break;
        case 'system':
          command = 'ps aux --system';
          break;
        case 'cpu':
          command = 'ps aux --sort=-%cpu | head -20';
          break;
        case 'memory':
          command = 'ps aux --sort=-%mem | head -20';
          break;
        default:
          command = 'ps aux | head -30';
      }

      const { stdout } = await execPromise(command);
      
      // پارس کردن خروجی ps
      const lines = stdout.split('\n');
      const header = lines[0];
      const processes = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            user: parts[0],
            pid: parseInt(parts[1]),
            cpu: parseFloat(parts[2]),
            mem: parseFloat(parts[3]),
            vsz: parts[4],
            rss: parts[5],
            tty: parts[6],
            stat: parts[7],
            start: parts[8],
            time: parts[9],
            command: parts.slice(10).join(' ')
          };
        });

      return {
        success: true,
        count: processes.length,
        processes
      };
    } catch (error) {
      logger.error(`Failed to list processes: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async killProcess(pid, signal = 'SIGTERM') {
    try {
      await execPromise(`kill -${signal} ${pid}`);
      
      logger.info(`Process ${pid} killed with signal ${signal}`);
      
      return {
        success: true,
        message: `Process ${pid} terminated with signal ${signal}`
      };
    } catch (error) {
      logger.error(`Failed to kill process ${pid}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getProcessInfo(pid) {
    try {
      const { stdout } = await execPromise(`ps -p ${pid} -o pid,ppid,user,%cpu,%mem,vsz,rss,tty,stat,start,time,command --no-headers`);
      
      const parts = stdout.trim().split(/\s+/, 11);
      const command = stdout.trim().substring(parts.join(' ').length).trim();

      return {
        success: true,
        pid: parseInt(parts[0]),
        ppid: parseInt(parts[1]),
        user: parts[2],
        cpu: parseFloat(parts[3]),
        mem: parseFloat(parts[4]),
        vsz: parts[5],
        rss: parts[6],
        tty: parts[7],
        stat: parts[8],
        start: parts[9],
        time: parts[10],
        command
      };
    } catch (error) {
      logger.error(`Failed to get process info: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getSystemLoad() {
    try {
      const { stdout: uptimeOutput } = await execPromise('uptime');
      const { stdout: topOutput } = await execPromise('top -bn1 | head -5');
      
      const loadMatch = uptimeOutput.match(/load average[s]?: (.*)/);
      const loads = loadMatch ? loadMatch[1].split(',').map(l => parseFloat(l.trim())) : [];

      return {
        success: true,
        loadAverage: {
          '1min': loads[0] || 0,
          '5min': loads[1] || 0,
          '15min': loads[2] || 0
        },
        top: topOutput
      };
    } catch (error) {
      logger.error(`Failed to get system load: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new ProcessService();