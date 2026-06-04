/**
 * @fileoverview Core type definitions and enums
 * @module core/types
 */

/**
 * Discord variant types
 * @readonly
 * @enum {string}
 */
export const DiscordVariant = Object.freeze({
    STABLE: 'Discord',
    PTB: 'DiscordPTB',
    CANARY: 'DiscordCanary',
    DEVELOPMENT: 'DiscordDevelopment'
});

/**
 * Injection status
 * @readonly
 * @enum {string}
 */
export const InjectionStatus = Object.freeze({
    NOT_INJECTED: 'not_injected',
    INJECTED: 'injected',
    CORRUPTED: 'corrupted',
    UNKNOWN: 'unknown'
});

/**
 * Operation result types
 * @readonly
 * @enum {string}
 */
export const OperationResult = Object.freeze({
    SUCCESS: 'success',
    FAILURE: 'failure',
    PARTIAL: 'partial',
    CANCELLED: 'cancelled'
});

/**
 * Log levels
 * @readonly
 * @enum {string}
 */
export const LogLevel = Object.freeze({
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    SUCCESS: 'success'
});

/**
 * Plugin lifecycle hooks
 * @readonly
 * @enum {string}
 */
export const PluginHook = Object.freeze({
    BEFORE_INJECT: 'beforeInject',
    AFTER_INJECT: 'afterInject',
    BEFORE_RESTORE: 'beforeRestore',
    AFTER_RESTORE: 'afterRestore',
    ON_CSS_CHANGE: 'onCssChange',
    ON_THEME_CHANGE: 'onThemeChange',
    ON_DISCORD_START: 'onDiscordStart',
    ON_DISCORD_CLOSE: 'onDiscordClose',
    ON_ERROR: 'onError'
});

/**
 * @typedef {Object} Result
 * @property {boolean} success - Whether operation succeeded
 * @property {*} [data] - Result data if successful
 * @property {Error} [error] - Error if failed
 * @property {string} [message] - Human-readable message
 */

/**
 * Create a success result
 * @template T
 * @param {T} data - Result data
 * @param {string} [message] - Optional message
 * @returns {{success: true, data: T, message?: string}}
 */
export function success(data, message) {
    return { success: true, data, message };
}

/**
 * Create a failure result
 * @param {Error|string} error - Error or error message
 * @param {string} [message] - Human-readable message
 * @returns {{success: false, error: Error, message: string}}
 */
export function failure(error, message) {
    const err = error instanceof Error ? error : new Error(error);
    return {
        success: false,
        error: err,
        message: message || err.message
    };
}

/**
 * @typedef {Object} DiscordInstallation
 * @property {string} variant - Discord variant (stable, ptb, canary)
 * @property {string} path - Full path to resources folder
 * @property {string} version - Discord version
 * @property {InjectionStatus} status - Current injection status
 */

/**
 * @typedef {Object} ThemeMetadata
 * @property {string} name - Theme name
 * @property {string} author - Theme author
 * @property {string} version - Theme version
 * @property {string} [description] - Theme description
 * @property {string[]} [tags] - Theme tags
 * @property {string} [preview] - Preview image URL
 */

/**
 * @typedef {Object} PluginManifest
 * @property {string} name - Plugin name (unique identifier)
 * @property {string} displayName - Human-readable name
 * @property {string} version - Semantic version
 * @property {string} author - Plugin author
 * @property {string} [description] - Plugin description
 * @property {string[]} [hooks] - Lifecycle hooks to subscribe
 * @property {Object} [config] - Default configuration
 * @property {string[]} [dependencies] - Required plugins
 */
