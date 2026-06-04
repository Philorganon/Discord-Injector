import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Discord variant types
 */
export const DiscordVariants = {
    STABLE: 'Discord',
    PTB: 'DiscordPTB',
    CANARY: 'DiscordCanary',
    DEVELOPMENT: 'DiscordDevelopment'
};

/**
 * Get base paths for all Discord variants by platform
 */
function getDiscordBasePaths(variant = DiscordVariants.STABLE) {
    const platform = os.platform();
    const home = os.homedir();

    switch (platform) {
        case 'win32':
            return {
                local: path.join(home, 'AppData', 'Local', variant),
                roaming: path.join(home, 'AppData', 'Roaming', variant)
            };

        case 'darwin':
            const appPath = `/Applications/${variant}.app`;
            return {
                app: appPath,
                resources: path.join(appPath, 'Contents', 'Resources')
            };

        case 'linux':
            return {
                config: path.join(home, '.config', variant.toLowerCase()),
                opt: `/opt/${variant}`,
                snap: path.join(home, 'snap', variant.toLowerCase())
            };

        default:
            return {};
    }
}

/**
 * Find latest app version in directory
 */
async function findLatestVersion(basePath) {
    try {
        if (!await fs.pathExists(basePath)) return null;

        const dirs = await fs.readdir(basePath);
        const appDirs = dirs
            .filter(d => d.startsWith('app-'))
            .sort((a, b) => {
                const verA = a.replace('app-', '').split('.').map(Number);
                const verB = b.replace('app-', '').split('.').map(Number);

                for (let i = 0; i < Math.max(verA.length, verB.length); i++) {
                    const numA = verA[i] || 0;
                    const numB = verB[i] || 0;
                    if (numA !== numB) return numB - numA;
                }
                return 0;
            });

        if (appDirs.length === 0) return null;

        return path.join(basePath, appDirs[0], 'resources');
    } catch (err) {
        return null;
    }
}

/**
 * Verify if path is valid Discord installation
 */
async function verifyDiscordPath(resourcePath) {
    try {
        if (!await fs.pathExists(resourcePath)) return false;

        const appAsarPath = path.join(resourcePath, 'app.asar');
        const originalAsarPath = path.join(resourcePath, 'original.asar');

        let validPath = null;

        if (await fs.pathExists(appAsarPath)) {
            validPath = appAsarPath;
        } else if (await fs.pathExists(originalAsarPath)) {
            validPath = originalAsarPath;
        } else {
            return false;
        }

        const stats = await fs.stat(validPath);
        if (stats.size < 1000000) return false;

        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Find single Discord variant
 */
export async function findDiscordVariant(variant = DiscordVariants.STABLE) {
    const paths = getDiscordBasePaths(variant);
    const platform = os.platform();

    let resourcePath = null;

    switch (platform) {
        case 'win32':
            resourcePath = await findLatestVersion(paths.local);
            break;

        case 'darwin':
            if (await fs.pathExists(paths.resources)) {
                resourcePath = paths.resources;
            }
            break;

        case 'linux':
            for (const location of Object.values(paths)) {
                resourcePath = await findLatestVersion(location);
                if (resourcePath) break;
            }
            break;
    }

    if (resourcePath && await verifyDiscordPath(resourcePath)) {
        return {
            variant,
            path: resourcePath,
            platform,
            version: await getDiscordVersion(resourcePath)
        };
    }

    return null;
}

/**
 * Get Discord version from app.asar
 */
async function getDiscordVersion(resourcePath) {
    try {
        const appAsarPath = path.join(resourcePath, 'app.asar');
        const packagePath = path.join(path.dirname(resourcePath), 'app.asar.unpacked', 'package.json');

        if (await fs.pathExists(packagePath)) {
            const pkg = await fs.readJson(packagePath);
            return pkg.version || 'unknown';
        }

        const parentDir = path.basename(path.dirname(resourcePath));
        const versionMatch = parentDir.match(/app-(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : 'unknown';
    } catch (err) {
        return 'unknown';
    }
}

/**
 * Find all Discord installations
 */
export async function findAllDiscordInstances() {
    const instances = [];

    for (const variant of Object.values(DiscordVariants)) {
        const result = await findDiscordVariant(variant);
        if (result) {
            instances.push(result);
        }
    }

    return instances;
}

/**
 * Find default Discord (Stable first, then PTB, then Canary)
 */
export async function findDiscordPath() {
    const priority = [
        DiscordVariants.STABLE,
        DiscordVariants.PTB,
        DiscordVariants.CANARY,
        DiscordVariants.DEVELOPMENT
    ];

    for (const variant of priority) {
        const result = await findDiscordVariant(variant);
        if (result) {
            return result.path;
        }
    }

    return null;
}

/**
 * Check if Discord is currently running
 */
export async function isDiscordRunning(variant = null) {
    const ps = await import('ps-node');

    return new Promise((resolve) => {
        const searchName = variant || 'Discord';

        ps.default.lookup({ command: searchName }, (err, resultList) => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(resultList.length > 0);
        });
    });
}

/**
 * Get injection status for Discord instance
 */
export async function getInjectionStatus(resourcePath) {
    try {
        const appFolder = path.join(resourcePath, 'app');
        const originalAsar = path.join(resourcePath, 'original.asar');

        const appExists = await fs.pathExists(appFolder);
        const originalExists = await fs.pathExists(originalAsar);

        if (appExists && originalExists) {
            const cssPath = path.join(appFolder, 'custom.css');
            if (await fs.pathExists(cssPath)) {
                const cssStats = await fs.stat(cssPath);
                const cssContent = await fs.readFile(cssPath, 'utf8');

                return {
                    injected: true,
                    cssSize: cssStats.size,
                    cssLines: cssContent.split('\n').length,
                    lastModified: cssStats.mtime,
                    backupExists: originalExists
                };
            }
        }

        return {
            injected: false,
            backupExists: originalExists
        };
    } catch (err) {
        return {
            injected: false,
            error: err.message
        };
    }
}

/**
 * Get detailed Discord info
 */
export async function getDiscordInfo(resourcePath) {
    try {
        const appAsarPath = path.join(resourcePath, 'app.asar');
        const stats = await fs.stat(appAsarPath);

        return {
            path: resourcePath,
            appAsarSize: stats.size,
            lastModified: stats.mtime,
            version: await getDiscordVersion(resourcePath),
            injectionStatus: await getInjectionStatus(resourcePath),
            isRunning: await isDiscordRunning()
        };
    } catch (err) {
        throw new Error(`Failed to get Discord info: ${err.message}`);
    }
}

/**
 * Search for Discord in custom paths
 */
export async function findDiscordInCustomPath(customPath) {
    try {
        const normalized = path.resolve(customPath);

        if (await verifyDiscordPath(normalized)) {
            return normalized;
        }

        const parentResources = path.join(path.dirname(normalized), 'resources');
        if (await verifyDiscordPath(parentResources)) {
            return parentResources;
        }

        const resourcesInside = path.join(normalized, 'resources');
        if (await verifyDiscordPath(resourcesInside)) {
            return resourcesInside;
        }

        return null;
    } catch (err) {
        return null;
    }
}

/**
 * Validate Discord path manually entered by user
 */
export async function validateDiscordPath(userPath) {
    const errors = [];

    if (!await fs.pathExists(userPath)) {
        errors.push('Path does not exist');
        return { valid: false, errors };
    }

    const appAsarPath = path.join(userPath, 'app.asar');
    if (!await fs.pathExists(appAsarPath)) {
        errors.push('app.asar not found (not a valid Discord resources folder)');
    }

    try {
        await fs.access(userPath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
        errors.push('No read/write permission');
    }

    const status = await getInjectionStatus(userPath);
    const warnings = [];
    if (status.injected) {
        warnings.push('Already injected - will be overwritten');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        info: errors.length === 0 ? await getDiscordInfo(userPath) : null
    };
}

/**
 * Get platform-specific Discord installation guide
 */
export function getInstallationGuide() {
    const platform = os.platform();

    const guides = {
        win32: {
            defaultPath: '%LOCALAPPDATA%\\Discord',
            downloadUrl: 'https://discord.com/download',
            instructions: [
                'Download Discord from discord.com',
                'Run the installer',
                'Discord will be installed in %LOCALAPPDATA%\\Discord',
                'Launch Discord at least once before using injector'
            ]
        },
        darwin: {
            defaultPath: '/Applications/Discord.app',
            downloadUrl: 'https://discord.com/download',
            instructions: [
                'Download Discord.dmg from discord.com',
                'Open the DMG file',
                'Drag Discord to Applications folder',
                'Launch Discord at least once before using injector'
            ]
        },
        linux: {
            defaultPath: '~/.config/discord',
            downloadUrl: 'https://discord.com/download',
            instructions: [
                'Download Discord (.deb, .tar.gz, or snap)',
                'Install using your package manager',
                'Or use: sudo snap install discord',
                'Launch Discord at least once before using injector'
            ]
        }
    };

    return guides[platform] || guides.linux;
}

/**
 * Export info about search locations
 */
export function getSearchLocations() {
    const platform = os.platform();
    const locations = [];

    Object.values(DiscordVariants).forEach(variant => {
        const paths = getDiscordBasePaths(variant);
        Object.entries(paths).forEach(([type, path]) => {
            locations.push({
                variant,
                type,
                path
            });
        });
    });

    return locations;
}

/**
 * Watch Discord installations for version changes
 * Uses chokidar (primary) with fallback to setInterval polling
 */
export function watchDiscordUpdates(onUpdate, options = {}) {
    const { pollInterval = 5000 } = options;

    let currentPath = null;
    let stopped = false;
    let pollTimer = null;
    let watcher = null;

    const getPathsToWatch = () => {
        const platform = os.platform();
        const home = os.homedir();
        const paths = [];

        const variants = Object.values(DiscordVariants);
        if (platform === 'win32') {
            variants.forEach(variant => {
                paths.push(path.join(home, 'AppData', 'Local', variant));
                paths.push(path.join(home, 'AppData', 'Roaming', variant));
            });
        } else if (platform === 'darwin') {
            variants.forEach(variant => {
                paths.push(`/Applications/${variant}.app/Contents/Resources`);
            });
        } else if (platform === 'linux') {
            variants.forEach(variant => {
                paths.push(path.join(home, '.config', variant.toLowerCase()));
                paths.push(`/opt/${variant}`);
                paths.push(path.join(home, 'snap', variant.toLowerCase()));
            });
        }

        return paths;
    };

    const checkUpdate = async () => {
        if (stopped) return;
        try {
            const latestPath = await findDiscordPath();
            if (latestPath && latestPath !== currentPath) {
                currentPath = latestPath;
                onUpdate(latestPath);
            }
        } catch (e) {
            // Silently ignore check errors
        }
    };

    const startPolling = () => {
        checkUpdate();
        pollTimer = setInterval(checkUpdate, pollInterval);
    };

    const startWatching = async () => {
        try {
            const chokidar = await import('chokidar');
            const pathsToWatch = getPathsToWatch();
            watcher = chokidar.watch(pathsToWatch, {
                depth: 2,
                ignored: /(^|[\/\\])\../,
                persistent: true,
                awaitWriteFinish: {
                    stabilityThreshold: 2000,
                    pollInterval: 100
                }
            });

            watcher.on('addDir', checkUpdate);
            watcher.on('change', checkUpdate);
            watcher.on('unlinkDir', checkUpdate);
            watcher.on('unlink', checkUpdate);
            watcher.on('error', () => {
                if (watcher) watcher.close();
                startPolling();
            });

            checkUpdate();
        } catch (e) {
            console.log('Chokidar not available, falling back to polling');
            startPolling();
        }
    };

    startWatching();

    return {
        stop: () => {
            stopped = true;
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
            if (watcher) {
                watcher.close();
                watcher = null;
            }
        },
        getCurrentPath: () => currentPath
    };
}
