import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs-extra';
import path from 'path';
import open from 'open';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function findFreePort(startPort = 8765) {
    const net = await import('net');
    for (let p = startPort; p < startPort + 100; p++) {
        const port = await new Promise((resolve) => {
            const server = net.createServer();
            server.listen(p, () => {
                server.close(() => resolve(p));
            });
            server.on('error', () => resolve(null));
        });
        if (port) return port;
    }
    return startPort;
}

export async function startServer(resourcePath, options = {}) {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });
    
    let port = parseInt(options.port, 10);
    if (!port || port < 1 || port > 65535) {
        port = 8765;
    }
    
    const actualPort = await findFreePort(port);
    
    const cssTarget = path.join(resourcePath, 'app', 'custom.css');
    let fileWatcher = null;
    const clients = new Set();

    app.use(express.static(path.join(__dirname, 'editor')));

    app.get('/api/css', async (req, res) => {
        try {
            const css = await fs.readFile(cssTarget, 'utf8');
            res.json({ css });
        } catch (e) {
            res.status(500).json({ error: 'File not found' });
        }
    });

    wss.on('connection', (ws) => {
        clients.add(ws);
        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            if (data.type === 'SAVE') {
                await fs.writeFile(cssTarget, data.css);
                console.log(chalk.green(`[Saved] ${new Date().toLocaleTimeString()}`));
            }
        });
        ws.on('close', () => clients.delete(ws));
    });

    if (options.watchMode) {
        try {
            const chokidar = await import('chokidar');
            fileWatcher = chokidar.watch(cssTarget, { persistent: true });
            fileWatcher.on('change', async () => {
                try {
                    const css = await fs.readFile(cssTarget, 'utf8');
                    const payload = JSON.stringify({ type: 'UPDATE', css });
                    clients.forEach(ws => {
                        if (ws.readyState === 1) ws.send(payload);
                    });
                } catch (e) {
                    // ignore
                }
            });
        } catch (e) {
            console.log(chalk.gray('Chokidar not available, watch mode disabled'));
        }
    }

    server.listen(actualPort, () => {
        console.log(chalk.cyan(`\nEditor ready at: http://localhost:${actualPort}`));
        console.log(chalk.gray('Press Ctrl+C to stop server'));
        open(`http://localhost:${actualPort}`);
    });
    
    return { server, port: actualPort, wss };
}
