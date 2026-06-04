/**
 * @fileoverview Custom error classes with context and recovery suggestions
 * @module core/errors
 */

/**
 * Base error class for all injector errors
 */
export class InjectorError extends Error {
    /**
     * @param {string} message - Error message
     * @param {Object} [options] - Error options
     * @param {string} [options.code] - Error code
     * @param {Error} [options.cause] - Original error
     * @param {Object} [options.context] - Additional context
     * @param {string[]} [options.suggestions] - Recovery suggestions
     * @param {boolean} [options.recoverable] - Whether error is recoverable
     */
    constructor(message, options = {}) {
        super(message);
        this.name = 'InjectorError';
        this.code = options.code || 'INJECTOR_ERROR';
        this.cause = options.cause;
        this.context = options.context || {};
        this.suggestions = options.suggestions || [];
        this.recoverable = options.recoverable ?? true;
        this.timestamp = new Date().toISOString();

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert to JSON for logging
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
            suggestions: this.suggestions,
            recoverable: this.recoverable,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    /**
     * Format error for display
     */
    format() {
        let output = `[${this.code}] ${this.message}`;

        if (this.suggestions.length > 0) {
            output += '\n\nSuggestions:';
            this.suggestions.forEach((s, i) => {
                output += `\n  ${i + 1}. ${s}`;
            });
        }

        return output;
    }
}

/**
 * Discord not found or invalid installation
 */
export class DiscordNotFoundError extends InjectorError {
    constructor(searchPaths = [], cause) {
        super('Discord installation not found', {
            code: 'DISCORD_NOT_FOUND',
            cause,
            context: { searchPaths },
            suggestions: [
                'Make sure Discord is installed',
                'Check if Discord is in the default location',
                'Try running as Administrator',
                'Manually specify Discord path with --path option'
            ],
            recoverable: false
        });
        this.name = 'DiscordNotFoundError';
    }
}

/**
 * Permission denied for file operations
 */
export class PermissionError extends InjectorError {
    constructor(path, operation, cause) {
        super(`Permission denied: Cannot ${operation} "${path}"`, {
            code: 'PERMISSION_DENIED',
            cause,
            context: { path, operation },
            suggestions: [
                'Run the command as Administrator (Windows) or with sudo (Linux/macOS)',
                'Check file/folder permissions',
                'Make sure Discord is completely closed',
                'Disable antivirus temporarily'
            ],
            recoverable: true
        });
        this.name = 'PermissionError';
    }
}

/**
 * File or path validation failed
 */
export class ValidationError extends InjectorError {
    constructor(message, field, value, cause) {
        super(message, {
            code: 'VALIDATION_ERROR',
            cause,
            context: { field, value: typeof value === 'string' ? value.substring(0, 100) : value },
            suggestions: [
                'Check the input format',
                'Ensure paths are absolute and valid',
                'Verify file exists and is accessible'
            ],
            recoverable: true
        });
        this.name = 'ValidationError';
    }
}

/**
 * Path security violation (path traversal, etc)
 */
export class SecurityError extends InjectorError {
    constructor(message, attemptedPath, cause) {
        super(message, {
            code: 'SECURITY_VIOLATION',
            cause,
            context: { attemptedPath: attemptedPath?.substring(0, 50) },
            suggestions: [
                'Only use paths within allowed directories',
                'Avoid using ".." in paths',
                'Check for malicious input'
            ],
            recoverable: false
        });
        this.name = 'SecurityError';
    }
}

/**
 * Injection operation failed
 */
export class InjectionError extends InjectorError {
    constructor(message, phase, cause) {
        super(message, {
            code: 'INJECTION_FAILED',
            cause,
            context: { phase },
            suggestions: [
                'Make sure Discord is completely closed',
                'Run as Administrator',
                'Try restoring first with "npm start restore"',
                'Check if antivirus is blocking the operation',
                'Verify Discord installation is not corrupted'
            ],
            recoverable: true
        });
        this.name = 'InjectionError';
    }
}

/**
 * Restore operation failed
 */
export class RestoreError extends InjectorError {
    constructor(message, cause) {
        super(message, {
            code: 'RESTORE_FAILED',
            cause,
            context: {},
            suggestions: [
                'Try manually restoring by:',
                '  1. Close Discord completely',
                '  2. Go to Discord resources folder',
                '  3. Delete the "app" folder',
                '  4. Rename "original.asar" to "app.asar"',
                'If that fails, reinstall Discord'
            ],
            recoverable: false
        });
        this.name = 'RestoreError';
    }
}

/**
 * Backup operation failed
 */
export class BackupError extends InjectorError {
    constructor(message, path, cause) {
        super(message, {
            code: 'BACKUP_FAILED',
            cause,
            context: { path },
            suggestions: [
                'Check available disk space',
                'Verify write permissions to backups folder',
                'Run as Administrator'
            ],
            recoverable: true
        });
        this.name = 'BackupError';
    }
}

/**
 * Plugin-related errors
 */
export class PluginError extends InjectorError {
    constructor(message, pluginName, cause) {
        super(message, {
            code: 'PLUGIN_ERROR',
            cause,
            context: { pluginName },
            suggestions: [
                'Check plugin compatibility',
                'Update the plugin to latest version',
                'Disable the plugin and try again',
                'Report the issue to plugin author'
            ],
            recoverable: true
        });
        this.name = 'PluginError';
    }
}

/**
 * Configuration error
 */
export class ConfigError extends InjectorError {
    constructor(message, key, cause) {
        super(message, {
            code: 'CONFIG_ERROR',
            cause,
            context: { key },
            suggestions: [
                'Check config.json syntax',
                'Reset config with "npm start config --reset"',
                'Delete config.json to use defaults'
            ],
            recoverable: true
        });
        this.name = 'ConfigError';
    }
}

/**
 * Network-related errors
 */
export class NetworkError extends InjectorError {
    constructor(message, url, cause) {
        super(message, {
            code: 'NETWORK_ERROR',
            cause,
            context: { url },
            suggestions: [
                'Check your internet connection',
                'Verify the URL is correct',
                'Try again later',
                'Check if firewall is blocking the request'
            ],
            recoverable: true
        });
        this.name = 'NetworkError';
    }
}

/**
 * Wrap any error into an InjectorError
 * @param {Error} error - Original error
 * @param {string} [context] - Additional context
 * @returns {InjectorError}
 */
export function wrapError(error, context) {
    if (error instanceof InjectorError) {
        if (context) {
            error.context.additionalInfo = context;
        }
        return error;
    }

    return new InjectorError(error.message, {
        code: 'UNKNOWN_ERROR',
        cause: error,
        context: { additionalInfo: context },
        suggestions: [
            'Check the logs for more details',
            'Try restarting the application',
            'Report the issue if it persists'
        ]
    });
}
