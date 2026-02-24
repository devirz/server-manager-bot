import { exec } from 'child_process';
import util from 'util';
import logger from '../utils/logger.js';
import config from '../config/config.js';

const execPromise = util.promisify(exec);

export class CommandService {
  async executeCommand(command, timeout = config.bot.maxCommandTimeout) {
    try {
      logger.info(`Executing command: ${command}`);
      
      const { stdout, stderr } = await execPromise(command, {
        timeout,
        maxBuffer: 1024 * 1024
      });

      return {
        success: true,
        output: stdout || stderr || 'Command executed with no output',
        error: stderr || null
      };
    } catch (error) {
      logger.error(`Command execution failed: ${error.message}`);
      
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message
      };
    }
  }

  async executeLongRunningCommand(command, onData) {
    const { exec } = await import('child_process');
    const childProcess = exec(command);
    
    childProcess.stdout.on('data', (data) => {
      onData(data.toString());
    });

    childProcess.stderr.on('data', (data) => {
      onData(`Error: ${data.toString()}`);
    });

    return new Promise((resolve) => {
      childProcess.on('close', (code) => {
        resolve({ code });
      });
    });
  }
}

export default new CommandService();