const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

// Ensure public dir exists
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/**
 * Extracts code blocks (HTML, CSS, JS) from a text.
 */
function extractCodeBlocks(text) {
    const htmlRegex = /```html\s*([\s\S]*?)\s*```/ig;
    const cssRegex = /```css\s*([\s\S]*?)\s*```/ig;
    const jsRegex = /```(?:javascript|js)\s*([\s\S]*?)\s*```/ig;

    const htmlMatches = [...text.matchAll(htmlRegex)];
    const cssMatches = [...text.matchAll(cssRegex)];
    const jsMatches = [...text.matchAll(jsRegex)];

    return {
        html: htmlMatches.map(m => m[1]).join('\n'),
        css: cssMatches.map(m => m[1]).join('\n'),
        js: jsMatches.map(m => m[1]).join('\n')
    };
}

/**
 * Processes the output from the CLI tool.
 */
async function processCliOutput(message, replyMessage, cliOutput) {
    const codeBlocks = extractCodeBlocks(cliOutput);

    // If we found HTML, we assume it's a website build request
    if (codeBlocks.html) {
        const siteId = uuidv4();
        const siteDir = path.join(PUBLIC_DIR, siteId);
        fs.mkdirSync(siteDir, { recursive: true });

        // If no explicit HTML body is found but we have pieces, construct a basic HTML wrapper
        let indexHtml = codeBlocks.html;

        // If it doesn't look like a full HTML document, wrap it
        if (!indexHtml.toLowerCase().includes('<!doctype html>') && !indexHtml.toLowerCase().includes('<html')) {
             indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Site</title>
    ${codeBlocks.css ? `<style>${codeBlocks.css}</style>` : ''}
</head>
<body>
    ${codeBlocks.html}
    ${codeBlocks.js ? `<script>${codeBlocks.js}</script>` : ''}
</body>
</html>`;
        } else {
             // Try to inject CSS and JS into existing HTML if it's a full document
             if (codeBlocks.css && !indexHtml.includes(codeBlocks.css)) {
                 indexHtml = indexHtml.replace('</head>', `<style>\n${codeBlocks.css}\n</style>\n</head>`);
             }
             if (codeBlocks.js && !indexHtml.includes(codeBlocks.js)) {
                 indexHtml = indexHtml.replace('</body>', `<script>\n${codeBlocks.js}\n</script>\n</body>`);
             }
        }

        fs.writeFileSync(path.join(siteDir, 'index.html'), indexHtml);

        // Get the public URL from the server module
        const { getPublicUrl } = require('../web/server');
        const baseUrl = getPublicUrl();

        if (baseUrl) {
             await replyMessage.edit(`Website generated successfully! Preview it here: ${baseUrl}/${siteId}`);
        } else {
             await replyMessage.edit(`Website generated locally in public directory, but public URL is not available.`);
        }

    } else {
        // It's a regular text response (brainstorming, answering questions)
        // Discord has a 2000 character limit per message
        const limit = 1900; // Leave some room
        if (cliOutput.length <= limit) {
            await replyMessage.edit(cliOutput || "No output generated.");
        } else {
            // Split into chunks
            let chunks = [];
            for (let i = 0; i < cliOutput.length; i += limit) {
                chunks.push(cliOutput.substring(i, i + limit));
            }

            await replyMessage.edit(chunks[0]);
            for (let i = 1; i < chunks.length; i++) {
                await message.reply(chunks[i]);
            }
        }
    }
}

module.exports = { processCliOutput };