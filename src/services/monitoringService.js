import si from 'systeminformation';
import os from 'os';
import logger from '../utils/logger.js';

class MonitoringService {
  constructor() {
    this.monitoringHistory = [];
    this.maxHistoryItems = 100;
    this.thresholds = {
      cpu: 80,
      memory: 85,
      disk: 90,
      loadAverage: 4
    };
  }

  async getRealTimeStats() {
    try {
      const [cpu, mem, disk, network, processes, temperature] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.processes(),
        si.cpuTemperature().catch(() => ({ main: null, cores: [] }))
      ]);

      // دریافت اینترفیس‌های شبکه
      const networkInterfaces = await this.#getNetworkInterfaces();

      const stats = {
        timestamp: new Date().toISOString(),
        cpu: {
          currentLoad: cpu.currentLoad.toFixed(2),
          avgLoad: os.loadavg(),
          cores: cpu.cpus.map(c => c.load.toFixed(2)),
          temperature: temperature.main ? temperature.main.toFixed(1) : 'نامشخص'
        },
        memory: {
          total: this.#formatBytes(mem.total),
          used: this.#formatBytes(mem.used),
          free: this.#formatBytes(mem.free),
          usagePercent: ((mem.used / mem.total) * 100).toFixed(2),
          swapTotal: this.#formatBytes(mem.swaptotal),
          swapUsed: this.#formatBytes(mem.swapused),
          swapFree: this.#formatBytes(mem.swapfree)
        },
        disk: disk.map(d => ({
          filesystem: d.fs,
          mount: d.mount,
          size: this.#formatBytes(d.size),
          used: this.#formatBytes(d.used),
          available: this.#formatBytes(d.available),
          usePercent: d.use.toFixed(2),
          type: d.type
        })),
        network: {
          interfaces: networkInterfaces,
          rxSec: this.#formatBytes(network[0]?.rx_sec || 0) + '/s',
          txSec: this.#formatBytes(network[0]?.tx_sec || 0) + '/s',
          totalRx: this.#formatBytes(network[0]?.rx_bytes || 0),
          totalTx: this.#formatBytes(network[0]?.tx_bytes || 0)
        },
        processes: {
          total: processes.all,
          running: processes.running,
          blocked: processes.blocked,
          sleeping: processes.sleeping
        },
        system: {
          uptime: this.#formatUptime(os.uptime()),
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release(),
          loadAvg: os.loadavg().map(l => l.toFixed(2))
        }
      };

      this.#addToHistory(stats);
      const alerts = this.#checkThresholds(stats);

      return { stats, alerts };
    } catch (error) {
      logger.error(`Monitoring error: ${error.message}`);
      throw error;
    }
  }

  async getTopProcesses(limit = 10) {
    try {
      const processes = await si.processes();
      return processes.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, limit)
        .map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: p.cpu.toFixed(2),
          mem: (p.mem / 1024 / 1024).toFixed(2) + ' مگابایت',
          memPercent: p.memRss ? ((p.memRss / os.totalmem()) * 100).toFixed(2) : '0',
          user: p.user,
          command: p.command.substring(0, 50)
        }));
    } catch (error) {
      logger.error(`Error getting top processes: ${error.message}`);
      return [];
    }
  }

  async getCpuHistory() {
    return this.monitoringHistory.map(h => ({
      time: new Date(h.timestamp).toLocaleTimeString('fa-IR'),
      cpu: parseFloat(h.cpu)
    }));
  }

  async getMemoryHistory() {
    return this.monitoringHistory.map(h => ({
      time: new Date(h.timestamp).toLocaleTimeString('fa-IR'),
      memory: parseFloat(h.memory)
    }));
  }

  async getNetworkHistory() {
    return this.monitoringHistory.map(h => ({
      time: new Date(h.timestamp).toLocaleTimeString('fa-IR'),
      rx: parseFloat(h.network.rx.replace(/[^0-9.]/g, '')),
      tx: parseFloat(h.network.tx.replace(/[^0-9.]/g, ''))
    }));
  }

  async getDiskIO() {
    try {
      return await si.disksIO();
    } catch (error) {
      return null;
    }
  }

  async getUsers() {
    try {
      return await si.users();
    } catch (error) {
      logger.error(`Error getting users: ${error.message}`);
      return [];
    }
  }

  async #getNetworkInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const result = [];
      
      for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
          if (addr.family === 'IPv4' && !addr.internal) {
            result.push({
              name,
              address: addr.address,
              netmask: addr.netmask,
              mac: addr.mac
            });
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error(`Error getting network interfaces: ${error.message}`);
      return [];
    }
  }

  #checkThresholds(stats) {
    const alerts = [];

    if (parseFloat(stats.cpu.currentLoad) > this.thresholds.cpu) {
      alerts.push({
        level: 'warning',
        metric: 'cpu',
        message: `مصرف CPU به ${stats.cpu.currentLoad}% رسید`,
        value: stats.cpu.currentLoad,
        threshold: this.thresholds.cpu
      });
    }

    if (parseFloat(stats.memory.usagePercent) > this.thresholds.memory) {
      alerts.push({
        level: 'warning',
        metric: 'memory',
        message: `مصرف رم به ${stats.memory.usagePercent}% رسید`,
        value: stats.memory.usagePercent,
        threshold: this.thresholds.memory
      });
    }

    stats.disk.forEach(disk => {
      if (parseFloat(disk.usePercent) > this.thresholds.disk) {
        alerts.push({
          level: 'warning',
          metric: 'disk',
          message: `دیسک ${disk.mount} به ${disk.usePercent}% پر شده`,
          value: disk.usePercent,
          threshold: this.thresholds.disk,
          mount: disk.mount
        });
      }
    });

    const loadAvg = stats.system.loadAvg[0];
    if (loadAvg > this.thresholds.loadAverage) {
      alerts.push({
        level: 'warning',
        metric: 'load',
        message: `لود اورج بالا: ${loadAvg}`,
        value: loadAvg,
        threshold: this.thresholds.loadAverage
      });
    }

    return alerts;
  }

  #addToHistory(stats) {
    this.monitoringHistory.push({
      timestamp: stats.timestamp,
      cpu: stats.cpu.currentLoad,
      memory: stats.memory.usagePercent,
      disk: stats.disk[0]?.usePercent || 0,
      network: {
        rx: stats.network.rxSec,
        tx: stats.network.txSec
      }
    });

    if (this.monitoringHistory.length > this.maxHistoryItems) {
      this.monitoringHistory.shift();
    }
  }

  #formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  #formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days} روز`);
    if (hours > 0) parts.push(`${hours} ساعت`);
    if (minutes > 0) parts.push(`${minutes} دقیقه`);
    return parts.join(' و ') || 'چند لحظه';
  }
}

export default new MonitoringService();