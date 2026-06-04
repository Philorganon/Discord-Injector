/**
 * @fileoverview Discord Discovery Service
 * @module services/discord
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
    logger,
    eventBus,
    Events,
    DiscordNotFoundError,
    DiscordVariant,
    InjectionStatus,
    validatePath
} from '../core/index.js';

/**
 * Discord installation paths by platform
 */
const DISCORD_PATHS = {
    win32: {
        base: path.join(os.homedir(), 'AppData', 'Local'),
        variants: {
            [DiscordVariant.STABLE]: 'Discord',
            [DiscordVariant.PTB]: 'DiscordPTB',
            [DiscordVariant.CANARY]: 'DiscordCanary',
            [DiscordVariant.DEVELOPMENT]: 'DiscordDevelopment'
        }
    },
    darwin: {
        base: '/Applications',
        variants: {
            [DiscordVariant.STABLE]: 'Discord.app',
            [DiscordVariant.PTB]: 'Discord PTB.app',
            [DiscordVariant.CANARY]: 'Discord Canary.app',
            [DiscordVariant.DEVELOPMENT]: 'Discord Development.app'
        },
        resourcesSubpath: 'Contents/Resources'
    },
    linux: {
        bases: [
            path.join(os.homedir(), '.config'),
            '/usr/share',
            '/opt'
        ],
        variants: {
            [DiscordVariant.STABLE]: 'discord',
            [DiscordVariant.PTB]: 'discordptb',
            [DiscordVariant.CANARY]: 'discordcanary',
            [DiscordVariant.DEVELOPMENT]: 'discorddevelopment'
        }
    }
};

/**
 * @typedef {Object} DiscordInstallation
 * @property {string} variant - Discord variant (stable, ptb, canary)
 * @property {string} path - Full path to resources folder
 * @property {string} version - Discord version
 * @property {string} status - Injection status
 */

/**
 * Find Discord installation path for a specific variant
 * @param {string} variant - Discord variant
 * @returns {Promise<string|null>} Path to resources folder
 */
async function findVariantPath(variant) {
    const platform = os.platform();

    try {
        if (platform === 'win32') {
            const config = DISCORD_PATHS.win32;
            const discordBase = path.join(config.base, config.variants[variant]);

            if (!await fs.pathExists(discordBase)) return null;

            // Find latest app-X.X.X folder
            const dirs = await fs.readdir(discordBase);
            const appDirs = dirs.filter(d => d.startsWith('app-')).sort().reverse();

            if (appDirs.length === 0) return null;

            return path.join(discordBase, appDirs[0], 'resources');

        } else if (platform === 'darwin') {
            const config = DISCORD_PATHS.darwin;
            const appPath = path.join(config.base, config.variants[variant]);

            if (!await fs.pathExists(appPath)) return null;

            return path.join(appPath, config.resourcesSubpath);

        } else if (platform === 'linux') {
            const config = DISCORD_PATHS.linux;

            for (const base of config.bases) {
                const discordPath = path.join(base, config.variants[variant]);

                if (await fs.pathExists(discordPath)) {
                    // Check for resources folder
                    const resourcesPath = path.join(discordPath, 'resources');
                    if (await fs.pathExists(resourcesPath)) {
                        return resourcesPath;
                    }
                }
            }

            return null;
        }

        return null;

    } catch (err) {
        logger.debug(`Error finding ${variant}:`, { error: err.message });
        return null;
    }
}

/**
 * Get Discord version from resources path
 * @param {string} resourcesPath - Path to resources folder
 * @returns {Promise<string>}
 */
async function getDiscordVersion(resourcesPath) {
    try {
        // Read from original.asar or app.asar
        const asarPath = await fs.pathExists(path.join(resourcesPath, 'original.asar'))
            ? path.join(resourcesPath, 'original.asar')
            : path.join(resourcesPath, 'app.asar');

        // For now, extract from path (app-X.X.X)
        const parentDir = path.dirname(resourcesPath);
        const match = path.basename(parentDir).match(/app-([\d.]+)/);

        return match ? match[1] : 'unknown';

    } catch {
        return 'unknown';
    }
}

/**
 * Get injection status for a Discord installation
 * @param {string} resourcesPath - Path to resources folder
 * @returns {Promise<string>}
 */
async function getInjectionStatus(resourcesPath) {
    const appFolder = path.join(resourcesPath, 'app');
    const originalAsar = path.join(resourcesPath, 'original.asar');
    const appAsar = path.join(resourcesPath, 'app.asar');

    const hasAppFolder = await fs.pathExists(appFolder);
    const hasOriginalAsar = await fs.pathExists(originalAsar);
    const hasAppAsar = await fs.pathExists(appAsar);

    if (hasAppFolder && hasOriginalAsar) {
        return InjectionStatus.INJECTED;
    } else if (hasAppFolder && hasAppAsar) {
        return InjectionStatus.CORRUPTED;
    } else if (hasAppAsar) {
        return InjectionStatus.NOT_INJECTED;
    }

    return InjectionStatus.UNKNOWN;
}

/**
 * Find all Discord installations
 * @returns {Promise<DiscordInstallation[]>}
 */
export async function findAllDiscord() {
    const installations = [];
    const searchedPaths = [];

    for (const variant of Object.values(DiscordVariant)) {
        const resourcesPath = await findVariantPath(variant);
        searchedPaths.push(variant);

        if (resourcesPath) {
            const version = await getDiscordVersion(resourcesPath);
            const status = await getInjectionStatus(resourcesPath);

            installations.push({
                variant,
                path: resourcesPath,
                version,
                status
            });

            logger.debug(`Found ${variant}`, { path: resourcesPath, version, status });
        }
    }

    if (installations.length > 0) {
        eventBus.emit(Events.DISCORD_FOUND, { installations });
    }

    return installations;
}

/**
 * Find primary Discord installation (stable first, then ptb, canary)
 * @returns {Promise<DiscordInstallation>}
 * @throws {DiscordNotFoundError}
 */
export async function findDiscord() {
    const installations = await findAllDiscord();

    if (installations.length === 0) {
        throw new DiscordNotFoundError(Object.values(DiscordVariant));
    }

    // Prefer stable, then PTB, then Canary
    const priority = [
        DiscordVariant.STABLE,
        DiscordVariant.PTB,
        DiscordVariant.CANARY,
        DiscordVariant.DEVELOPMENT
    ];

    for (const variant of priority) {
        const found = installations.find(i => i.variant === variant);
        if (found) {
            logger.info(`Using ${found.variant}`, { path: found.path });
            return found;
        }
    }

    // Fallback to first found
    return installations[0];
}

/**
 * Find Discord path (backward compatible)
 * @returns {Promise<string|null>}
 */
export async function findDiscordPath() {
    try {
        const installation = await findDiscord();
        return installation.path;
    } catch {
        return null;
    }
}

/**
 * Discord service object
 */
export const discordService = {
    findAll: findAllDiscord,
    find: findDiscord,
    findPath: findDiscordPath,
    getVersion: getDiscordVersion,
    getStatus: getInjectionStatus
};
