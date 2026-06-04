import fs from 'fs-extra';
import path from 'path';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

/**
 * Ensure backups directory exists
 */
export async function ensureBackupsDir() {
    await fs.ensureDir(BACKUPS_DIR);
}

/**
 * Create a backup copy of a file
 */
export async function createBackup(filePath) {
    if (fs.existsSync(filePath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUPS_DIR, `${path.basename(filePath)}.${timestamp}.bak`);

        await fs.ensureDir(BACKUPS_DIR);
        await fs.copy(filePath, backupPath);
        return backupPath;
    }
    return null;
}

/**
 * List all backups in the backups directory
 * @returns {Array<{filename: string, path: string, size: number, date: Date}>}
 */
export async function listBackups() {
    await ensureBackupsDir();

    try {
        const files = await fs.readdir(BACKUPS_DIR);
        const backups = [];

        for (const file of files) {
            if (!file.endsWith('.bak')) continue;

            const fullPath = path.join(BACKUPS_DIR, file);
            const stats = await fs.stat(fullPath);

            backups.push({
                filename: file,
                path: fullPath,
                size: stats.size,
                date: stats.mtime
            });
        }

        // Sort by date, newest first
        backups.sort((a, b) => b.date - a.date);

        return backups;
    } catch (err) {
        console.error('Failed to list backups:', err);
        return [];
    }
}

/**
 * Restore a backup file to a destination path
 * @param {string} backupFilename - The backup filename to restore
 * @param {string} [destination] - Destination path (defaults to the original file location inferred from filename)
 * @returns {{success: boolean, path?: string, error?: string}}
 */
export async function restoreBackup(backupFilename, destination) {
    await ensureBackupsDir();

    // Validate backup exists
    // Support both exact filename and partial match
    let backupPath = path.join(BACKUPS_DIR, backupFilename);

    if (!await fs.pathExists(backupPath)) {
        // Try to find a backup that starts with the given filename (before timestamp)
        const files = await fs.readdir(BACKUPS_DIR);
        const matches = files.filter(f =>
            f.startsWith(backupFilename.replace(/\.bak$/, '')) && f.endsWith('.bak')
        );

        if (matches.length === 0) {
            return {
                success: false,
                error: `Backup not found: ${backupFilename}`
            };
        }

        // Use the newest match
        const newestMatch = matches.sort().reverse()[0];
        backupPath = path.join(BACKUPS_DIR, newestMatch);
    }

    try {
        const resolvedDest = destination || inferOriginalPath(backupFilename);

        // Ensure destination directory exists
        await fs.ensureDir(path.dirname(resolvedDest));

        // Copy backup to destination
        await fs.copy(backupPath, resolvedDest);

        return {
            success: true,
            path: resolvedDest
        };
    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

/**
 * Infer the original file path from a backup filename
 * Format: {original-filename}.{timestamp}.bak
 * Example: app.asar.2026-01-01T12-00-00-000Z.bak -> app.asar
 */
function inferOriginalPath(backupFilename) {
    // Remove everything after the original filename
    const base = backupFilename.replace(/\.\d{4}-\d{2}-\d{2}T.*\.bak$/, '');

    if (base === 'app.asar') {
        return path.join(process.cwd(), 'resources', 'app.asar');
    }

    if (base === 'custom.css') {
        return path.join(process.cwd(), 'resources', 'app', 'custom.css');
    }

    // Default: same directory as backup
    return path.join(BACKUPS_DIR, '..', base);
}

/**
 * Clean old backups, keeping only the N most recent
 * @param {number} [maxBackups=10] - Maximum number of backups to keep
 * @returns {{deleted: number, kept: number}}
 */
export async function cleanOldBackups(maxBackups = 10) {
    await ensureBackupsDir();

    try {
        const files = await fs.readdir(BACKUPS_DIR);
        const backups = files
            .filter(f => f.endsWith('.bak'))
            .map(f => ({
                filename: f,
                path: path.join(BACKUPS_DIR, f)
            }));

        // Sort by filename (which includes timestamp), oldest first
        backups.sort((a, b) => a.filename.localeCompare(b.filename));

        const toDelete = backups.slice(0, Math.max(0, backups.length - maxBackups));
        const toKeep = backups.slice(Math.max(0, backups.length - maxBackups));

        for (const backup of toDelete) {
            await fs.remove(backup.path);
        }

        return {
            deleted: toDelete.length,
            kept: toKeep.length
        };
    } catch (err) {
        console.error('Failed to clean backups:', err);
        return {
            deleted: 0,
            kept: 0,
            error: err.message
        };
    }
}

/**
 * Get backup info by filename
 * @param {string} filename
 * @returns {Promise<Object|null>}
 */
export async function getBackupInfo(filename) {
    await ensureBackupsDir();

    // Try exact match first
    let backupPath = path.join(BACKUPS_DIR, filename);
    if (!await fs.pathExists(backupPath)) {
        // Try prefix match
        const base = filename.replace(/\.bak$/, '');
        const files = await fs.readdir(BACKUPS_DIR);
        const matches = files.filter(f => f.startsWith(base) && f.endsWith('.bak'));

        if (matches.length === 0) return null;

        // Use newest match
        backupPath = path.join(BACKUPS_DIR, matches.sort().reverse()[0]);
    }

    const stats = await fs.stat(backupPath);

    return {
        filename: path.basename(backupPath),
        path: backupPath,
        size: stats.size,
        date: stats.mtime
    };
}