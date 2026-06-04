/**
 * @fileoverview Professional logging system with multiple transports
 * @module core/logger
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { eventBus, Events } from './events.js';

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
    debug: { priority: 0, color: 'gray', icon: '⚙' },
    info: { priority: 1, color: 'blue', icon: 'ℹ' },
    success: { priority: 2, color: 'green', icon: '✓' },
    warn: { priority: 3, color: 'yellow', icon: '⚠' },
    error: { priority: 4, color: 'red', icon: '✖' }
};

/**
 * Logger configuration
 */
let config = {
    level: 'info',
    console: true,
    file: true,
    logDir: path.join(process.cwd(), 'logs'),
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 10,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    format: 'text', // 'text' or 'json'
    timestamp: true
};

/**
 * Current log file path
 */
let currentLogFile = null;

/**
 * Initialize logger
 * @param {Object} options - Logger options
 */
export async function initLogger(options = {}) {
    config = { ...config, ...options };

    if (config.file) {
        await fs.ensureDir(config.logDir);
        currentLogFile = path.join(
            config.logDir,
            `injector-${new Date().toISOString().split('T')[0]}.log`
        );
    }
}

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [meta] - Additional metadata
 * @returns {string} Formatted message
 */
function formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelInfo = LOG_LEVELS[level];

    if (config.format === 'json') {
        return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
        });
    }

    let formatted = '';

    if (config.timestamp) {
        formatted += `[${timestamp}] `;
    }

    formatted += `[${level.toUpperCase().padEnd(7)}] ${message}`;

    if (Object.keys(meta).length > 0) {
        formatted += ` ${JSON.stringify(meta)}`;
    }

    return formatted;
}

/**
 * Write to console with colors
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [meta] - Additional metadata
 */
function writeToConsole(level, message, meta = {}) {
    if (!config.console) return;

    const levelInfo = LOG_LEVELS[level];
    const colorFn = chalk[levelInfo.color] || chalk.white;

    let output = `${levelInfo.icon} ${message}`;

    if (meta.error) {
        output += `\n  ${chalk.gray(meta.error.message || meta.error)}`;
    }

    if (meta.context) {
        output += `\n  ${chalk.gray(JSON.stringify(meta.context))}`;
    }

    console.log(colorFn(output));
}

/**
 * Write to file
 * @param {string} formatted - Formatted message
 */
async function writeToFile(formatted) {
    if (!config.file || !currentLogFile) return;

    try {
        // Check file size and rotate if needed
        if (await fs.pathExists(currentLogFile)) {
            const stats = await fs.stat(currentLogFile);
            if (stats.size >= config.maxFileSize) {
                await rotateLog();
            }
        }

        await fs.appendFile(currentLogFile, formatted + '\n');
    } catch (err) {
        // Silent fail for logging
        console.error('Failed to write log:', err.message);
    }
}

/**
 * Rotate log file
 */
async function rotateLog() {
    const timestamp = Date.now();
    const rotatedPath = currentLogFile.replace('.log', `.${timestamp}.log`);

    await fs.rename(currentLogFile, rotatedPath);

    // Cleanup old logs
    await cleanOldLogs();
}

/**
 * Clean old log files
 */
export async function cleanOldLogs() {
    if (!config.file) return;

    try {
        const files = await fs.readdir(config.logDir);
        const logFiles = files
            .filter(f => f.endsWith('.log'))
            .map(f => ({
                name: f,
                path: path.join(config.logDir, f),
                time: fs.statSync(path.join(config.logDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        const now = Date.now();

        for (let i = 0; i < logFiles.length; i++) {
            const file = logFiles[i];
            const isOld = now - file.time > config.maxAge;
            const isTooMany = i >= config.maxFiles;

            if (isOld || isTooMany) {
                await fs.remove(file.path);
            }
        }
    } catch (err) {
        // Silent fail
    }
}

/**
 * Check if should log at this level
 * @param {string} level - Log level
 * @returns {boolean}
 */
function shouldLog(level) {
    const configPriority = LOG_LEVELS[config.level]?.priority || 0;
    const messagePriority = LOG_LEVELS[level]?.priority || 0;
    return messagePriority >= configPriority;
}

/**
 * Core log function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [meta] - Additional metadata
 */
async function log(level, message, meta = {}) {
    if (!shouldLog(level)) return;

    const formatted = formatMessage(level, message, meta);

    // Console output
    writeToConsole(level, message, meta);

    // File output
    await writeToFile(formatted);

    // Emit log event
    eventBus.emit(Events.LOG, { level, message, meta, timestamp: new Date() });
}

/**
 * Logger interface
 */
export const logger = {
    /**
     * Debug level log
     * @param {string} message 
     * @param {Object} [meta] 
     */
    debug: (message, meta) => log('debug', message, meta),

    /**
     * Info level log
     * @param {string} message 
     * @param {Object} [meta] 
     */
    info: (message, meta) => log('info', message, meta),

    /**
     * Success level log
     * @param {string} message 
     * @param {Object} [meta] 
     */
    success: (message, meta) => log('success', message, meta),

    /**
     * Warning level log
     * @param {string} message 
     * @param {Object} [meta] 
     */
    warn: (message, meta) => log('warn', message, meta),

    /**
     * Error level log
     * @param {string} message 
     * @param {Object} [meta] 
     */
    error: (message, meta) => log('error', message, meta),

    /**
     * Log with custom level
     * @param {string} level 
     * @param {string} message 
     * @param {Object} [meta] 
     */
    log: (level, message, meta) => log(level, message, meta),

    /**
     * Set log level
     * @param {string} level 
     */
    setLevel: (level) => {
        if (LOG_LEVELS[level]) {
            config.level = level;
        }
    },

    /**
     * Get current config
     * @returns {Object}
     */
    getConfig: () => ({ ...config }),

    /**
     * Create child logger with context
     * @param {Object} context - Default context
     * @returns {Object} Child logger
     */
    child: (context) => ({
        debug: (msg, meta) => log('debug', msg, { ...context, ...meta }),
        info: (msg, meta) => log('info', msg, { ...context, ...meta }),
        success: (msg, meta) => log('success', msg, { ...context, ...meta }),
        warn: (msg, meta) => log('warn', msg, { ...context, ...meta }),
        error: (msg, meta) => log('error', msg, { ...context, ...meta })
    })
};

/**
 * Performance timer
 */
export class Timer {
    constructor(label) {
        this.label = label;
        this.start = process.hrtime.bigint();
    }

    /**
     * End timer and log duration
     * @param {string} [level='debug'] - Log level
     */
    end(level = 'debug') {
        const end = process.hrtime.bigint();
        const duration = Number(end - this.start) / 1000000; // Convert to ms
        log(level, `${this.label}: ${duration.toFixed(2)}ms`);
        return duration;
    }
}

/**
 * Create a performance timer
 * @param {string} label - Timer label
 * @returns {Timer}
 */
export function timer(label) {
    return new Timer(label);
}

// Auto-initialize with defaults
await initLogger();
