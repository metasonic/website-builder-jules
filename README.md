# website-builder-jules

A Discord bot that uses installed CLI AI tools (`claude`, `gemini`, `kilo`, `blackbox`, `codex`) to brainstorm, extract data, and generate websites right inside Discord.

## Requirements

* Node.js
* One or more of the supported AI CLI tools installed on the system where this bot will run.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
   * Set `DISCORD_BOT_TOKEN` to your bot's token.
   * Set `MINIMAX_API_KEY` to enable intelligent prompt routing using the MiniMax API.
   * Set `DEFAULT_CLI_TOOL` to the fallback tool (e.g., `claude`).
   * Set `PORT` for the local web server used to host generated websites (default `3000`).

## Usage

Start the bot:
```bash
node src/index.js
```

### Discord Commands

Mention the bot in a Discord channel to talk to it.

**Basic brainstorming:**
> @Bot Can you give me 5 ideas for a new startup?

**Using a specific tool:**
To use a specific tool, simply start your message with the tool name:
> @Bot gemini What is the capital of France?

**Generating a website:**
When the AI tool generates HTML/CSS/JS code blocks in its response, the bot will automatically extract them, build a website, host it locally, and send you a public preview link using Localtunnel!
> @Bot claude Create a beautiful landing page for a coffee shop using HTML and CSS.

**Analyzing files:**
You can upload attachments (images, text files) along with your message. The bot will download them temporarily and pass their file paths to the CLI tool.
> [Image attached] @Bot Describe this image.

## Modifying Supported Tools

If your local CLI command differs from the default name (e.g., you use `gemini-cli` instead of `gemini`), you can update the `TOOL_COMMAND_MAP` inside `src/core/cliRunner.js`.