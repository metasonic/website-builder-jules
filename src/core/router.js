const Anthropic = require('@anthropic-ai/sdk');

// Configuration for supported tools and their descriptions for the router
const TOOL_DESCRIPTIONS = {
    'claude': 'Excellent for general coding, debugging, refactoring, and logical reasoning.',
    'gemini': 'Great for integrating with Google ecosystem, multimodal tasks, and general programming.',
    'kilo': 'Fast, lightweight tasks or specific Kiro-based environments.',
    'blackbox': 'Specialized in searching for code snippets, analyzing repositories, and rapid code generation.',
    'codex': 'Focused on translating natural language into code, particularly good for scripts and boilerplate.',
    'qwen': 'Strong capabilities in code generation, particularly with diverse and complex programming tasks.'
};

const SUPPORTED_TOOLS = Object.keys(TOOL_DESCRIPTIONS);

/**
 * Uses the MiniMax API (via Anthropic SDK compatibility) to determine
 * the most suitable CLI tool for a given prompt.
 *
 * @param {string} prompt The user's prompt.
 * @returns {Promise<string>} The name of the selected tool.
 */
async function routeWithMinimax(prompt) {
    if (!process.env.MINIMAX_API_KEY) {
        console.warn('MINIMAX_API_KEY is not set. Falling back to default tool.');
        return process.env.DEFAULT_CLI_TOOL || 'claude';
    }

    const client = new Anthropic({
        apiKey: process.env.MINIMAX_API_KEY,
        baseURL: 'https://api.minimax.io/anthropic',
    });

    const systemPrompt = `You are an intelligent routing assistant for a Discord bot.
The bot has access to the following AI CLI tools:
${Object.entries(TOOL_DESCRIPTIONS).map(([tool, desc]) => `- ${tool}: ${desc}`).join('\n')}

Based on the user's prompt, determine which single tool is the absolute best fit for the task.
You must reply with EXACTLY ONE WORD: the name of the tool (must be one of: ${SUPPORTED_TOOLS.join(', ')}).
Do not provide any explanation, punctuation, or extra text.`;

    try {
        const response = await client.messages.create({
            model: "MiniMax-M2.7",
            max_tokens: 10,
            system: systemPrompt,
            messages: [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        });

        const replyContent = response.content.find(block => block.type === 'text')?.text?.trim().toLowerCase() || '';

        // Ensure the response is exactly one of our supported tools
        for (const tool of SUPPORTED_TOOLS) {
            if (replyContent.includes(tool)) {
                return tool;
            }
        }

        // Fallback
        return process.env.DEFAULT_CLI_TOOL || 'claude';

    } catch (error) {
        console.error('Error calling MiniMax routing API:', error);
        return process.env.DEFAULT_CLI_TOOL || 'claude';
    }
}

module.exports = { routeWithMinimax, SUPPORTED_TOOLS };