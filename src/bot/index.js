const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { executeCliCommand } = require('../core/cliRunner');
const { processCliOutput } = require('./responseHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel],
});

const { routeWithMinimax, SUPPORTED_TOOLS } = require('../core/router');
const DEFAULT_TOOL = process.env.DEFAULT_CLI_TOOL || 'claude';
const TEMP_DIR = path.join(__dirname, '..', '..', 'tmp');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

async function parseMessage(content, botId) {
    // Remove the bot mention
    const cleanContent = content.replace(`<@${botId}>`, '').trim();

    // Check if the user specified a tool at the beginning
    const firstWord = cleanContent.split(' ')[0].toLowerCase();

    let tool = null;
    let prompt = cleanContent;

    if (SUPPORTED_TOOLS.includes(firstWord)) {
        tool = firstWord;
        // Remove the tool name from the prompt
        prompt = cleanContent.substring(firstWord.length).trim();
    } else {
        // If no explicit tool is given, use MiniMax to intelligently route it.
        // We do this asynchronously.
        tool = await routeWithMinimax(cleanContent);
    }

    return { tool, prompt };
}

async function downloadAttachment(attachment) {
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(attachment.name);
    const filePath = path.join(TEMP_DIR, `${Date.now()}_${safeFilename}`);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(attachment.url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filePath);
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => {}); // Delete the file async.
            reject(err);
        });
    });
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if bot is mentioned
    if (!message.mentions.has(client.user.id)) return;

    const filePaths = [];
    try {
        // Since parsing now uses an async API call, we should await it
        // We'll let the user know we're thinking first
        const reply = await message.reply(`Thinking about how to handle this request...`);

        const { tool, prompt } = await parseMessage(message.content, client.user.id);

        // Update reply to show which tool was selected
        await reply.edit(`Routing request to \`${tool}\`...`);

        // Handle attachments
        for (const [id, attachment] of message.attachments) {
            const filePath = await downloadAttachment(attachment);
            filePaths.push(filePath);
        }

        // Execute CLI command
        const cliOutput = await executeCliCommand(tool, prompt, filePaths);

        // Process response (Host website or send text)
        await processCliOutput(message, reply, cliOutput);

    } catch (error) {
        console.error('Error processing message:', error);
        message.reply(`An error occurred: ${error.message}`);
    } finally {
        // Clean up temporary files regardless of success or failure
        for (const filePath of filePaths) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (cleanupError) {
                console.error(`Failed to cleanup temp file ${filePath}:`, cleanupError);
            }
        }
    }
});

async function startBot() {
    if (!process.env.DISCORD_BOT_TOKEN) {
        console.warn('DISCORD_BOT_TOKEN is not set. Bot will not start.');
        return;
    }
    await client.login(process.env.DISCORD_BOT_TOKEN);
}

module.exports = { startBot };