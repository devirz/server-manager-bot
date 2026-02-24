import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../utils/logger.js';
import config from '../config/config.js';

const execPromise = util.promisify(exec);

export class BackupService {
  #backupDir = path.join(os.tmpdir(), 'server-backups');

  constructor() {
    this.#initBackupDir();
  }

  async #initBackupDir() {
    try {
      await fs.mkdir(this.#backupDir, { recursive: true });
    } catch (error) {
      logger.error(`Failed to create backup directory: ${error.message}`);
    }
  }

  async createSystemBackup(options = {}) {
    const {
      includeEtc = true,
      includeHome = false,
      includeVar = false,
      includeLogs = false
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `system-backup-${timestamp}.tar.gz`;
    const backupPath = path.join(this.#backupDir, backupName);

    let directories = '';
    if (includeEtc) directories += '/etc ';
    if (includeHome) directories += '/home ';
    if (includeVar) directories += '/var ';
    if (includeLogs) directories += '/var/log ';

    if (!directories) {
      directories = '/etc'; // پیش‌فرض
    }

    try {
      const command = `sudo tar -czf ${backupPath} ${directories} 2>&1`;
      const { stdout, stderr } = await execPromise(command, { timeout: 300000 }); // 5 دقیقه تایم‌اوت

      // محاسبه حجم فایل
      const stats = await fs.stat(backupPath);
      const fileSize = this.#formatBytes(stats.size);

      logger.info(`Backup created successfully: ${backupName} (${fileSize})`);

      return {
        success: true,
        path: backupPath,
        name: backupName,
        size: fileSize,
        output: stdout || stderr
      };
    } catch (error) {
      logger.error(`Backup creation failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createDatabaseBackup(dbType = 'mysql', dbName = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `db-backup-${dbType}-${timestamp}.sql.gz`;
    const backupPath = path.join(this.#backupDir, backupName);

    try {
      let command;
      
      if (dbType === 'mysql') {
        command = `mysqldump --all-databases | gzip > ${backupPath}`;
        if (dbName) {
          command = `mysqldump ${dbName} | gzip > ${backupPath}`;
        }
      } else if (dbType === 'postgresql') {
        command = `pg_dumpall | gzip > ${backupPath}`;
        if (dbName) {
          command = `pg_dump ${dbName} | gzip > ${backupPath}`;
        }
      } else {
        throw new Error(`Unsupported database type: ${dbType}`);
      }

      const { stdout, stderr } = await execPromise(command, { timeout: 300000 });
      
      const stats = await fs.stat(backupPath);
      const fileSize = this.#formatBytes(stats.size);

      return {
        success: true,
        path: backupPath,
        name: backupName,
        size: fileSize,
        output: stdout || stderr
      };
    } catch (error) {
      logger.error(`Database backup failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanupOldBackups(maxAge = 7) { // حذف بکاپ‌های قدیمی‌تر از 7 روز
    try {
      const files = await fs.readdir(this.#backupDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.#backupDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24); // age in days

        if (fileAge > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          logger.info(`Deleted old backup: ${file}`);
        }
      }

      return { success: true, deletedCount };
    } catch (error) {
      logger.error(`Cleanup failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  #formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
}

export default new BackupService();