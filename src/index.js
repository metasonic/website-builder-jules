require('dotenv').config();
const { startBot } = require('./bot');
const { startServer } = require('./web/server');

const port = process.env.PORT || 3000;

async function main() {
    try {
        await startServer(port);
        console.log(`Web server started on port ${port}`);

        await startBot();
        console.log('Discord bot started');
    } catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}

main();