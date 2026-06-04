import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

/**
 * Status presets
 */
export const statusPresets = {
    gaming: {
        name: '🎮 Gaming',
        games: [
            'Playing Minecraft',
            'Playing Valorant - Ranked',
            'Playing GTA V Online',
            'Playing League of Legends',
            'Playing Genshin Impact'
        ]
    },
    working: {
        name: '💼 Working',
        activities: [
            'Working on Discord Bot',
            'Coding a Website',
            'Debugging Code',
            'Learning React.js'
        ]
    },
    streaming: {
        name: '🔴 Streaming',
        text: 'LIVE on Twitch',
        color: '#9146ff'
    },
    music: {
        name: '🎵 Music',
        songs: [
            'Listening to Spotify',
            'Listening to Lofi Hip Hop',
            'Vibing to Music'
        ]
    },
    custom: {
        name: '✨ Custom',
        text: 'Your custom status here'
    }
};

/**
 * Generate status CSS
 */
export function generateStatusCSS(preset, customText = null) {
    const text = customText || (preset.games?.[0] || preset.activities?.[0] || preset.text);
    
    return `
/* Auto-generated Status */
[class*="nameTag"] [class*="activity"]::after {
    content: "${text}" !important;
    display: block !important;
    color: ${preset.color || '#43b581'} !important;
    font-size: 12px !important;
    margin-top: 2px !important;
}
`;
}

/**
 * Apply status to Discord
 */
export async function applyStatus(resourcePath, presetName, customText = null) {
    try {
        const preset = statusPresets[presetName];
        
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }
        
        const statusCSS = generateStatusCSS(preset, customText);
        const cssPath = path.join(resourcePath, 'app', 'custom.css');
        
        // Read existing CSS
        let existingCSS = '';
        if (await fs.pathExists(cssPath)) {
            existingCSS = await fs.readFile(cssPath, 'utf8');
        }
        
        // Remove old status CSS
        existingCSS = existingCSS.replace(/\/\* Auto-generated Status \*\/[\s\S]*?\}/g, '');
        
        // Append new status CSS
        const newCSS = existingCSS + '\n\n' + statusCSS;
        
        await fs.writeFile(cssPath, newCSS);
        
        logger.success(`Status applied: ${presetName}`);
        
        return true;
        
    } catch (err) {
        logger.error(`Failed to apply status: ${err.message}`);
        throw err;
    }
}