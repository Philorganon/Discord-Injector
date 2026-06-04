/**
 * @fileoverview Input validation and sanitization
 * @module core/validator
 */

import path from 'path';
import fs from 'fs-extra';
import { ValidationError, SecurityError } from './errors.js';

/**
 * Allowed base directories for file operations
 */
const ALLOWED_BASES = new Set([
    'Discord',
    'DiscordPTB',
    'DiscordCanary',
    'DiscordDevelopment'
]);

/**
 * Dangerous patterns to block
 */
const DANGEROUS_PATTERNS = [
    /\.\.[\/\\]/,           // Path traversal
    /^[\/\\]/,              // Absolute paths (when not expected)
    /%2e%2e/i,              // Encoded path traversal
    /\0/,                   // Null bytes
    /[\r\n]/,               // Line breaks in paths
    /<script/i,             // Script injection
    /javascript:/i,         // JavaScript protocol
    /data:/i,               // Data protocol
];

/**
 * CSS injection patterns to sanitize
 */
const CSS_DANGEROUS_PATTERNS = [
    /expression\s*\(/gi,    // IE expression
    /@import\s+url/gi,      // External imports (flag, don't block)
    /javascript:/gi,        // JavaScript in CSS
    /behavior\s*:/gi,       // IE behavior
    /-moz-binding/gi,       // Firefox XBL binding
];

/**
 * Validate and sanitize file path
 * @param {string} inputPath - Path to validate
 * @param {Object} options - Validation options
 * @param {string} [options.basePath] - Required base path
 * @param {boolean} [options.mustExist] - Path must exist
 * @param {boolean} [options.isFile] - Must be a file
 * @param {boolean} [options.isDirectory] - Must be a directory
 * @param {string[]} [options.allowedExtensions] - Allowed file extensions
 * @returns {string} Sanitized absolute path
 * @throws {ValidationError|SecurityError}
 */
export function validatePath(inputPath, options = {}) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new ValidationError('Path is required and must be a string', 'path', inputPath);
    }

    // Trim and normalize
    let sanitized = inputPath.trim();

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(sanitized)) {
            throw new SecurityError(
                'Path contains potentially dangerous pattern',
                sanitized
            );
        }
    }

    // Resolve to absolute path
    const absolutePath = path.resolve(sanitized);

    // Normalize path separators
    const normalized = path.normalize(absolutePath);

    // Check for path traversal after normalization
    if (options.basePath) {
        const baseResolved = path.resolve(options.basePath);
        if (!normalized.startsWith(baseResolved)) {
            throw new SecurityError(
                'Path traversal detected: path is outside allowed directory',
                normalized
            );
        }
    }

    // Check existence
    if (options.mustExist && !fs.existsSync(normalized)) {
        throw new ValidationError(
            `Path does not exist: ${normalized}`,
            'path',
            normalized
        );
    }

    // Check type
    if (options.mustExist) {
        const stats = fs.statSync(normalized);

        if (options.isFile && !stats.isFile()) {
            throw new ValidationError(
                'Path is not a file',
                'path',
                normalized
            );
        }

        if (options.isDirectory && !stats.isDirectory()) {
            throw new ValidationError(
                'Path is not a directory',
                'path',
                normalized
            );
        }
    }

    // Check extension
    if (options.allowedExtensions) {
        const ext = path.extname(normalized).toLowerCase();
        if (!options.allowedExtensions.includes(ext)) {
            throw new ValidationError(
                `Invalid file extension. Allowed: ${options.allowedExtensions.join(', ')}`,
                'extension',
                ext
            );
        }
    }

    return normalized;
}

/**
 * Validate CSS content
 * @param {string} css - CSS content to validate
 * @param {Object} options - Validation options
 * @param {boolean} [options.strict] - Strict mode (block all warnings)
 * @param {number} [options.maxSize] - Maximum size in bytes
 * @returns {{valid: boolean, css: string, warnings: string[]}}
 */
export function validateCSS(css, options = {}) {
    const warnings = [];
    let sanitized = css;

    if (!css || typeof css !== 'string') {
        throw new ValidationError('CSS content is required', 'css', typeof css);
    }

    // Check size
    const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
    if (Buffer.byteLength(css, 'utf8') > maxSize) {
        throw new ValidationError(
            `CSS exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
            'css',
            Buffer.byteLength(css, 'utf8')
        );
    }

    // Check for dangerous patterns
    for (const pattern of CSS_DANGEROUS_PATTERNS) {
        if (pattern.test(sanitized)) {
            const match = sanitized.match(pattern)?.[0];
            warnings.push(`Potentially dangerous CSS pattern detected: ${match}`);

            if (options.strict) {
                throw new SecurityError(
                    `Dangerous CSS pattern blocked: ${match}`,
                    match
                );
            }
        }
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Validate basic CSS syntax (simple check)
    const openBraces = (sanitized.match(/{/g) || []).length;
    const closeBraces = (sanitized.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
        warnings.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
    }

    return {
        valid: warnings.length === 0,
        css: sanitized,
        warnings
    };
}

/**
 * Validate theme metadata
 * @param {Object} metadata - Theme metadata
 * @returns {Object} Validated metadata
 */
export function validateThemeMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        throw new ValidationError('Theme metadata is required', 'metadata', metadata);
    }

    const validated = {
        name: sanitizeString(metadata.name, 'Theme Name', 100),
        author: sanitizeString(metadata.author || 'Unknown', 'author', 50),
        version: sanitizeVersion(metadata.version || '1.0.0'),
        description: sanitizeString(metadata.description || '', 'description', 500),
        tags: validateTags(metadata.tags),
        preview: metadata.preview ? sanitizeUrl(metadata.preview) : null
    };

    return validated;
}

/**
 * Validate plugin manifest
 * @param {Object} manifest - Plugin manifest
 * @returns {Object} Validated manifest
 */
export function validatePluginManifest(manifest) {
    if (!manifest || typeof manifest !== 'object') {
        throw new ValidationError('Plugin manifest is required', 'manifest', manifest);
    }

    if (!manifest.name || typeof manifest.name !== 'string') {
        throw new ValidationError('Plugin name is required', 'name', manifest.name);
    }

    // Validate name format (alphanumeric, hyphens, underscores)
    if (!/^[a-z0-9_-]+$/i.test(manifest.name)) {
        throw new ValidationError(
            'Plugin name must contain only letters, numbers, hyphens, and underscores',
            'name',
            manifest.name
        );
    }

    const validated = {
        name: manifest.name.toLowerCase(),
        displayName: sanitizeString(manifest.displayName || manifest.name, 'displayName', 50),
        version: sanitizeVersion(manifest.version || '1.0.0'),
        author: sanitizeString(manifest.author || 'Unknown', 'author', 50),
        description: sanitizeString(manifest.description || '', 'description', 500),
        hooks: validateHooks(manifest.hooks),
        config: manifest.config || {},
        dependencies: validateDependencies(manifest.dependencies)
    };

    return validated;
}

/**
 * Sanitize string input
 * @param {string} input - Input string
 * @param {string} fieldName - Field name for errors
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
export function sanitizeString(input, fieldName, maxLength = 255) {
    if (typeof input !== 'string') {
        input = String(input || '');
    }

    // Remove dangerous characters
    let sanitized = input
        .replace(/<[^>]*>/g, '')    // Remove HTML tags
        .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep printable chars
        .trim();

    // Truncate
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}

/**
 * Validate semantic version
 * @param {string} version - Version string
 * @returns {string} Validated version
 */
export function sanitizeVersion(version) {
    const semverPattern = /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

    if (typeof version !== 'string') {
        return '1.0.0';
    }

    const match = version.trim().match(semverPattern);
    if (!match) {
        return '1.0.0';
    }

    return version.trim();
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {string} Validated URL
 */
export function sanitizeUrl(url) {
    if (typeof url !== 'string') {
        throw new ValidationError('URL must be a string', 'url', url);
    }

    try {
        const parsed = new URL(url);

        // Only allow http/https
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new ValidationError(
                'Only HTTP/HTTPS URLs are allowed',
                'url',
                url
            );
        }

        return parsed.href;
    } catch (err) {
        throw new ValidationError('Invalid URL format', 'url', url);
    }
}

/**
 * Validate tags array
 * @param {string[]} tags - Tags array
 * @returns {string[]} Validated tags
 */
function validateTags(tags) {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags
        .filter(tag => typeof tag === 'string')
        .map(tag => sanitizeString(tag, 'tag', 30).toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 10); // Max 10 tags
}

/**
 * Validate plugin hooks
 * @param {string[]} hooks - Hooks array
 * @returns {string[]} Validated hooks
 */
function validateHooks(hooks) {
    const validHooks = [
        'beforeInject',
        'afterInject',
        'beforeRestore',
        'afterRestore',
        'onCssChange',
        'onThemeChange',
        'onDiscordStart',
        'onDiscordClose',
        'onError'
    ];

    if (!Array.isArray(hooks)) {
        return [];
    }

    return hooks.filter(hook => validHooks.includes(hook));
}

/**
 * Validate plugin dependencies
 * @param {string[]} deps - Dependencies array
 * @returns {string[]} Validated dependencies
 */
function validateDependencies(deps) {
    if (!Array.isArray(deps)) {
        return [];
    }

    return deps
        .filter(dep => typeof dep === 'string')
        .filter(dep => /^[a-z0-9_-]+$/i.test(dep))
        .map(dep => dep.toLowerCase())
        .slice(0, 20); // Max 20 dependencies
}

/**
 * Validate Discord path
 * @param {string} discordPath - Path to Discord resources
 * @returns {boolean} True if valid Discord path
 */
export function isValidDiscordPath(discordPath) {
    if (!discordPath || typeof discordPath !== 'string') {
        return false;
    }

    try {
        const normalized = path.normalize(discordPath);

        // Check if path contains Discord folder
        const hasDiscord = ALLOWED_BASES.has(path.basename(path.dirname(path.dirname(normalized)))) ||
            normalized.includes('Discord');

        // Check if resources folder exists
        const isResourcesFolder = path.basename(normalized) === 'resources' ||
            fs.existsSync(path.join(normalized, 'app.asar')) ||
            fs.existsSync(path.join(normalized, 'original.asar'));

        return hasDiscord && isResourcesFolder;
    } catch {
        return false;
    }
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration object
 * @param {Object} schema - Validation schema
 * @returns {Object} Validated configuration
 */
export function validateConfig(config, schema) {
    const validated = {};

    for (const [key, rules] of Object.entries(schema)) {
        const value = config[key];

        // Check required
        if (rules.required && (value === undefined || value === null)) {
            throw new ValidationError(`Configuration key "${key}" is required`, key, value);
        }

        // Skip undefined optional values
        if (value === undefined && !rules.required) {
            if (rules.default !== undefined) {
                validated[key] = rules.default;
            }
            continue;
        }

        // Type check
        if (rules.type && typeof value !== rules.type) {
            throw new ValidationError(
                `Configuration key "${key}" must be of type ${rules.type}`,
                key,
                typeof value
            );
        }

        // Range check for numbers
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                throw new ValidationError(
                    `Configuration key "${key}" must be >= ${rules.min}`,
                    key,
                    value
                );
            }
            if (rules.max !== undefined && value > rules.max) {
                throw new ValidationError(
                    `Configuration key "${key}" must be <= ${rules.max}`,
                    key,
                    value
                );
            }
        }

        // Enum check
        if (rules.enum && !rules.enum.includes(value)) {
            throw new ValidationError(
                `Configuration key "${key}" must be one of: ${rules.enum.join(', ')}`,
                key,
                value
            );
        }

        // Custom validator
        if (rules.validate && typeof rules.validate === 'function') {
            const result = rules.validate(value);
            if (result !== true) {
                throw new ValidationError(
                    result || `Configuration key "${key}" failed validation`,
                    key,
                    value
                );
            }
        }

        validated[key] = value;
    }

    return validated;
}
