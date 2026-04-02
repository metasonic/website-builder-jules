const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

// Mapping of internal tool names to actual system commands.
// This allows for flexibility if the system command differs from the discord command.
const TOOL_COMMAND_MAP = {
    'claude': 'claude',
    'gemini': 'gemini',
    'kilo': 'kilo',
    'blackbox': 'blackbox',
    'codex': 'codex'
};

/**
 * Executes a CLI command with the given tool, prompt, and files.
 * @param {string} tool The name of the tool to run.
 * @param {string} prompt The text prompt to pass to the tool.
 * @param {string[]} filePaths Array of paths to files that should be analyzed.
 * @returns {Promise<string>} The combined stdout/stderr of the command.
 */
async function executeCliCommand(tool, prompt, filePaths) {
    const executable = TOOL_COMMAND_MAP[tool];
    if (!executable) {
        throw new Error(`Unsupported tool: ${tool}`);
    }

    // Build arguments array to avoid OS Command Injection
    const args = [];
    if (prompt) {
        args.push(prompt);
    }

    if (filePaths && filePaths.length > 0) {
        args.push(...filePaths);
    }

    console.log(`Executing CLI: ${executable} ${args.join(' ')}`);

    try {
        const { stdout, stderr } = await execFilePromise(executable, args);
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