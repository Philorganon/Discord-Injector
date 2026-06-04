import RPC from 'discord-rpc';
import { logger } from './logger.js';

let client = null;
let connected = false;

/**
 * Activity presets for Rich Presence
 */
export const rpcPresets = {
    gaming: {
        name: 'Gaming',
        activities: [
            { details: 'Playing Minecraft', state: 'Building a house', largeImageText: 'Minecraft' },
            { details: 'Playing Valorant', state: 'Competitive Match', largeImageText: 'Valorant' },
            { details: 'Playing GTA V', state: 'Online Session', largeImageText: 'GTA V' },
            { details: 'Playing League of Legends', state: 'Ranked Solo', largeImageText: 'LoL' },
        ]
    },
    coding: {
        name: 'Coding',
        activities: [
            { details: 'Working on a project', state: 'Writing JavaScript', largeImageText: 'VS Code' },
            { details: 'Building a website', state: 'React + Next.js', largeImageText: 'Web Dev' },
            { details: 'Debugging code', state: 'Finding bugs', largeImageText: 'Debug' },
            { details: 'Learning new tech', state: 'Reading docs', largeImageText: 'Learning' },
        ]
    },
    music: {
        name: 'Music',
        activities: [
            { details: 'Listening to music', state: 'Lofi Hip Hop', largeImageText: 'Spotify' },
            { details: 'Vibing to beats', state: 'Chill playlist', largeImageText: 'Music' },
        ]
    },
    streaming: {
        name: 'Streaming',
        activities: [
            { details: 'LIVE on Twitch', state: 'Gaming stream', largeImageText: 'Twitch' },
            { details: 'LIVE on YouTube', state: 'Just chatting', largeImageText: 'YouTube' },
        ]
    },
    custom: {
        name: 'Custom',
        activities: []
    }
};

/**
 * Initialize RPC client
 * @param {string} clientId - Discord Application ID
 */
export async function initRPC(clientId) {
    if (connected) {
        console.log('RPC already connected');
        return true;
    }

    try {
        client = new RPC.Client({ transport: 'ipc' });

        client.on('ready', () => {
            console.log(`RPC connected as ${client.user.username}`);
            connected = true;
        });

        client.on('disconnected', () => {
            console.log('RPC disconnected');
            connected = false;
        });

        await client.login({ clientId });

        // Wait a bit for connection
        await new Promise(resolve => setTimeout(resolve, 1000));

        return connected;
    } catch (err) {
        console.error('RPC connection failed:', err.message);
        return false;
    }
}

/**
 * Set Rich Presence activity
 * @param {Object} activity - Activity object
 */
export async function setActivity(activity) {
    if (!client || !connected) {
        throw new Error('RPC not connected. Call initRPC first.');
    }

    try {
        // Build minimal activity object - Discord RPC is strict about empty fields
        const activityData = {
            details: activity.details || 'Playing',
            startTimestamp: Date.now(),
        };

        // Only add state if it has a value
        if (activity.state && activity.state.trim() !== '') {
            activityData.state = activity.state;
        }

        await client.setActivity(activityData);

        logger.success(`Activity set: ${activity.details}`);
        return true;
    } catch (err) {
        logger.error(`Failed to set activity: ${err.message}`);
        throw err;
    }
}

/**
 * Clear Rich Presence
 */
export async function clearActivity() {
    if (!client || !connected) return;

    try {
        await client.clearActivity();
        logger.info('Activity cleared');
    } catch (err) {
        logger.error(`Failed to clear activity: ${err.message}`);
    }
}

/**
 * Disconnect RPC
 */
export async function disconnectRPC() {
    if (!client) return;

    try {
        await client.destroy();
        connected = false;
        client = null;
        logger.info('RPC disconnected');
    } catch (err) {
        logger.error(`Failed to disconnect RPC: ${err.message}`);
    }
}

/**
 * Check if RPC is connected
 */
export function isConnected() {
    return connected;
}

/**
 * Get current user
 */
export function getUser() {
    return client?.user || null;
}
