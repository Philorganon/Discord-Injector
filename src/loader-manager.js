import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

/**
 * Loading screen themes
 */
export const loaderThemes = {
    gradient: {
        name: 'Gradient Purple',
        colors: ['#667eea', '#764ba2'],
        text: 'Loading Your Custom Discord... ✨'
    },
    cyber: {
        name: 'Cyberpunk',
        colors: ['#0f0f23', '#1a0933'],
        text: 'INITIALIZING NEURAL LINK... █▓▒░',
        class: 'loader-cyber'
    },
    minimal: {
        name: 'Minimal White',
        colors: ['#ffffff', '#f5f5f5'],
        text: 'Loading...',
        class: 'loader-minimal'
    },
    gaming: {
        name: 'Gaming RGB',
        colors: ['#ff0080', '#ff8c00', '#40e0d0'],
        text: '🎮 LOADING GAME... READY PLAYER ONE!',
        class: 'loader-gaming'
    },
    dark: {
        name: 'Dark Purple',
        colors: ['#1e1e2e', '#2d2b55'],
        text: 'Loading Discord...',
        class: 'loader-purple'
    }
};

/**
 * Apply loading screen theme
 */
export async function applyLoader(resourcePath, themeName = 'gradient') {
    try {
        const theme = loaderThemes[themeName];
        
        if (!theme) {
            throw new Error(`Unknown loader theme: ${themeName}`);
        }
        
        // Read custom-loader.css
        const loaderCSS = await fs.readFile(
            path.join(process.cwd(), 'src', 'css', 'themes', 'custom-loader.css'),
            'utf8'
        );
        
        // Read existing custom.css
        const cssPath = path.join(resourcePath, 'app', 'custom.css');
        let existingCSS = '';
        
        if (await fs.pathExists(cssPath)) {
            existingCSS = await fs.readFile(cssPath, 'utf8');
        }
        
        // Remove old loader CSS
        existingCSS = existingCSS.replace(/\/\*\*[\s\S]*?@name Custom Loading Screen[\s\S]*?\*\//g, '');
        
        // Append new loader CSS
        const newCSS = existingCSS + '\n\n' + loaderCSS;
        
        await fs.writeFile(cssPath, newCSS);
        
        logger.success(`Loading screen applied: ${theme.name}`);
        
        return true;
        
    } catch (err) {
        logger.error(`Failed to apply loader: ${err.message}`);
        throw err;
    }
}

/**
 * Generate custom loader CSS
 */
export function generateCustomLoader(config) {
    const { colors, text, animation } = config;
    
    return `
/* Custom Generated Loader */
[class*="splashScreen"] {
    background: linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%) !important;
}

[class*="splashScreen"]::after {
    content: "${text}" !important;
}
`;
}