const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

// Mapping of internal tool names to actual system commands and their required flags for non-interactive execution.
const TOOL_CONFIG = {
    'claude': { cmd: 'claude', flag: '-p' },
    'gemini': { cmd: 'gemini', flag: '--prompt' },
    'kilo': { cmd: 'kiro-cli', subcmd: 'chat', flag: '--no-interactive' },
    'blackbox': { cmd: 'blackbox', flag: null }, // Assuming positional or standard piping
    'codex': { cmd: 'codex', subcmd: 'exec', flag: null }, // Codex uses `codex exec "prompt"`
    'qwen': { cmd: 'qwen', flag: null } // Assuming positional
};

/**
 * Executes a CLI command with the given tool, prompt, and files.
 * @param {string} tool The name of the tool to run.
 * @param {string} prompt The text prompt to pass to the tool.
 * @param {string[]} filePaths Array of paths to files that should be analyzed.
 * @returns {Promise<string>} The combined stdout/stderr of the command.
 */
async function executeCliCommand(tool, prompt, filePaths) {
    const config = TOOL_CONFIG[tool];
    if (!config) {
        throw new Error(`Unsupported tool: ${tool}`);
    }

    const executable = config.cmd;
    const args = [];

    // Append subcommand if present (e.g., kiro-cli chat, codex exec)
    if (config.subcmd) {
        args.push(config.subcmd);
    }

    // Append non-interactive flag if present
    if (config.flag) {
        args.push(config.flag);
    }

    // Build arguments array to avoid OS Command Injection
    if (prompt) {
        args.push(prompt);
    }

    // File inputs might need special flags depending on the tool,
    // but for now we append them as positional arguments.
    // For production, we should probably check if tool supports file flags.
    if (filePaths && filePaths.length > 0) {
        args.push(...filePaths);
    }

    console.log(`Executing CLI: ${executable} ${args.join(' ')}`);

    try {
        // Adding a 60 second timeout to prevent the bot from hanging indefinitely
        const { stdout, stderr } = await execFilePromise(executable, args, { timeout: 60000 });
        // Combine stdout and stderr. Often these tools might write to stderr even on success.
        return stdout + (stderr ? `\n${stderr}` : '');
    } catch (error) {
        console.error(`Error executing command: ${executable} ${args.join(' ')}`, error);
        // Include output from failed commands as well, as they might contain useful info.
        const output = error.stdout || '';
        const errOutput = error.stderr || '';
        return `Error executing tool: ${error.message}\nOutput: ${output}\n${errOutput}`;
    }
}

module.exports = { executeCliCommand };