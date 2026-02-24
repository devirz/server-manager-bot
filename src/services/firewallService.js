import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import logger from '../utils/logger.js';

const execPromise = util.promisify(exec);

class FirewallService {
  async checkUFW() {
    try {
      const { stdout } = await execPromise('which ufw');
      return stdout.trim() !== '';
    } catch {
      return false;
    }
  }

  async installUFW() {
    try {
      await execPromise('sudo apt-get update');
      await execPromise('sudo apt-get install -y ufw');
      return { success: true, message: '✅ UFW با موفقیت نصب شد' };
    } catch (error) {
      logger.error(`Failed to install UFW: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getStatus() {
    try {
      const { stdout } = await execPromise('sudo ufw status numbered');
      const isActive = !stdout.includes('inactive');
      
      // پارس کردن قوانین
      const rules = [];
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const match = line.match(/^\[\s*(\d+)\]\s+(.+)$/);
        if (match) {
          rules.push({
            number: parseInt(match[1]),
            rule: match[2].trim()
          });
        }
      }

      return {
        success: true,
        active: isActive,
        rules,
        raw: stdout
      };
    } catch (error) {
      logger.error(`Failed to get firewall status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async enable() {
    try {
      const { stdout } = await execPromise('echo "y" | sudo ufw enable');
      return { 
        success: true, 
        message: '✅ فایروال فعال شد',
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to enable firewall: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async disable() {
    try {
      const { stdout } = await execPromise('sudo ufw disable');
      return { 
        success: true, 
        message: '✅ فایروال غیرفعال شد',
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to disable firewall: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async reset() {
    try {
      const { stdout } = await execPromise('echo "y" | sudo ufw reset');
      return { 
        success: true, 
        message: '✅ فایروال بازنشانی شد',
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to reset firewall: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async allowPort(port, protocol = 'tcp', description = '') {
    try {
      const cmd = description 
        ? `sudo ufw allow ${port}/${protocol} comment '${description}'`
        : `sudo ufw allow ${port}/${protocol}`;
      
      const { stdout } = await execPromise(cmd);
      return { 
        success: true, 
        message: `✅ پورت ${port}/${protocol} مجاز شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to allow port: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async denyPort(port, protocol = 'tcp') {
    try {
      const { stdout } = await execPromise(`sudo ufw deny ${port}/${protocol}`);
      return { 
        success: true, 
        message: `✅ پورت ${port}/${protocol} مسدود شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to deny port: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async allowIP(ip, description = '') {
    try {
      const cmd = description
        ? `sudo ufw allow from ${ip} comment '${description}'`
        : `sudo ufw allow from ${ip}`;
      
      const { stdout } = await execPromise(cmd);
      return { 
        success: true, 
        message: `✅ آی‌پی ${ip} مجاز شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to allow IP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async denyIP(ip) {
    try {
      const { stdout } = await execPromise(`sudo ufw deny from ${ip}`);
      return { 
        success: true, 
        message: `✅ آی‌پی ${ip} مسدود شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to deny IP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async allowService(service) {
    try {
      const { stdout } = await execPromise(`sudo ufw allow ${service}`);
      return { 
        success: true, 
        message: `✅ سرویس ${service} مجاز شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to allow service: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async denyService(service) {
    try {
      const { stdout } = await execPromise(`sudo ufw deny ${service}`);
      return { 
        success: true, 
        message: `✅ سرویس ${service} مسدود شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to deny service: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async deleteRule(ruleNumber) {
    try {
      const { stdout } = await execPromise(`echo "y" | sudo ufw delete ${ruleNumber}`);
      return { 
        success: true, 
        message: `✅ قانون شماره ${ruleNumber} حذف شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to delete rule: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async allowSSH() {
    return await this.allowPort(22, 'tcp', 'SSH access');
  }

  async allowHTTP() {
    return await this.allowPort(80, 'tcp', 'HTTP web traffic');
  }

  async allowHTTPS() {
    return await this.allowPort(443, 'tcp', 'HTTPS web traffic');
  }

  async allowFromNetwork(network, port, protocol = 'tcp') {
    try {
      const { stdout } = await execPromise(`sudo ufw allow from ${network} to any port ${port} proto ${protocol}`);
      return { 
        success: true, 
        message: `✅ ترافیک از ${network} به پورت ${port}/${protocol} مجاز شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to allow from network: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async limitConnection(port, protocol = 'tcp') {
    // محدود کردن تعداد کانکشن‌ها برای جلوگیری از brute force
    try {
      const { stdout } = await execPromise(`sudo ufw limit ${port}/${protocol}`);
      return { 
        success: true, 
        message: `✅ محدودیت کانکشن برای پورت ${port}/${protocol} اعمال شد`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to limit connection: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getLogging() {
    try {
      const { stdout } = await execPromise('sudo ufw status verbose | grep Logging');
      return { success: true, logging: stdout.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setLogging(level = 'on') {
    // levels: on, off, low, medium, high
    try {
      const { stdout } = await execPromise(`sudo ufw logging ${level}`);
      return { 
        success: true, 
        message: `✅ سطح لاگینگ به ${level} تغییر یافت`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to set logging: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getDefaultPolicy() {
    try {
      const { stdout } = await execPromise('sudo ufw status verbose | grep Default');
      return { success: true, policy: stdout.trim() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async setDefaultPolicy(policy, direction = 'incoming') {
    // policy: allow, deny, reject
    // direction: incoming, outgoing, routed
    try {
      const { stdout } = await execPromise(`sudo ufw default ${policy} ${direction}`);
      return { 
        success: true, 
        message: `✅ سیاست پیش‌فرض برای ${direction} به ${policy} تغییر یافت`,
        output: stdout 
      };
    } catch (error) {
      logger.error(`Failed to set default policy: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getFirewallRules() {
    try {
      const { stdout } = await execPromise('sudo ufw show added');
      return {
        success: true,
        rules: stdout.split('\n').filter(line => line.trim()),
        raw: stdout
      };
    } catch (error) {
      logger.error(`Failed to get firewall rules: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async backupRules() {
    try {
      const { stdout } = await execPromise('sudo ufw status numbered');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `/tmp/ufw-backup-${timestamp}.txt`;
      await fs.writeFile(backupPath, stdout);
      return {
        success: true,
        path: backupPath,
        message: '✅ قوانین فایروال پشتیبان‌گیری شد'
      };
    } catch (error) {
      logger.error(`Failed to backup rules: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default new FirewallService();