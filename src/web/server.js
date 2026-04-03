const express = require('express');
const localtunnel = require('localtunnel');
const path = require('path');

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

let publicUrl = null;

// Serve static files from the public directory
app.use(express.static(PUBLIC_DIR));

async function startServer(port) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, async () => {
            try {
                // Start localtunnel to expose the server
                const tunnel = await localtunnel({ port: port });
                publicUrl = tunnel.url;

                tunnel.on('close', () => {
                    console.log('Localtunnel closed');
                });

                resolve(server);
            } catch (err) {
                console.error("Failed to start localtunnel:", err);
                reject(err);
            }
        });

        server.on('error', (err) => {
            reject(err);
        });
    });
}

function getPublicUrl() {
    return publicUrl;
}

module.exports = { startServer, getPublicUrl };