const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

// Shared configuration with src/core/cliRunner.js
const TOOL_CONFIG = {
    'claude': { cmd: 'claude', flag: '-p' },
    'gemini': { cmd: 'gemini', flag: '--prompt' },
    'kilo': { cmd: 'kiro-cli', subcmd: 'chat', flag: '--no-interactive' },
    'blackbox': { cmd: 'blackbox', flag: null },
    'codex': { cmd: 'codex', subcmd: 'exec', flag: null },
    'qwen': { cmd: 'qwen', flag: null }
};

const TEST_PROMPT = "Reply with exactly one word: OK";

async function testTool(toolName, config) {
    console.log(`\n-----------------------------------`);
    console.log(`Testing tool: ${toolName}`);

    // First test if executable is found
    try {
        await execFilePromise('which', [config.cmd]);
        console.log(`✅ Executable found: ${config.cmd}`);
    } catch (e) {
        console.log(`❌ Executable NOT FOUND: ${config.cmd}`);
        console.log(`   Ensure ${config.cmd} is installed and in your PATH.`);
        return false;
    }

    // Now test if we can send and receive data
    console.log(`   Sending test prompt...`);
    const args = [];
    if (config.subcmd) args.push(config.subcmd);
    if (config.flag) args.push(config.flag);
    args.push(TEST_PROMPT);

    try {
        const { stdout, stderr } = await execFilePromise(config.cmd, args, { timeout: 30000 }); // 30s timeout

        console.log(`✅ Command executed successfully!`);
        console.log(`   Output:`);
        console.log(`   ${stdout.trim()}`);

        if (stderr) {
            console.log(`   Stderr: ${stderr.trim()}`);
        }

        // Simple heuristic to see if it requires config.
        const output = stdout.toLowerCase() + stderr.toLowerCase();
        if (output.includes('login') || output.includes('auth') || output.includes('api key') || output.includes('configure')) {
            console.log(`⚠️  Warning: Tool might require authentication or configuration.`);
        }

        return true;
    } catch (error) {
        console.log(`❌ Command execution FAILED.`);
        if (error.code === 'ETIMEDOUT') {
            console.log(`   Error: Request timed out. Tool might be waiting for interactive input or stuck.`);
        } else {
            console.log(`   Error: ${error.message}`);
        }

        const errOutput = (error.stdout || '') + (error.stderr || '');
        if (errOutput) {
             console.log(`   Output:\n   ${errOutput.trim()}`);
        }

        if (errOutput.toLowerCase().includes('login') || errOutput.toLowerCase().includes('api key')) {
             console.log(`   Troubleshooting: Tool likely requires authentication/API keys to be configured first.`);
        }

        return false;
    }
}

async function runTests() {
    console.log("===================================");
    console.log("   CLI TOOL DIAGNOSTIC TEST RUN");
    console.log("===================================");

    let passed = 0;
    let total = Object.keys(TOOL_CONFIG).length;

    for (const [toolName, config] of Object.entries(TOOL_CONFIG)) {
        const result = await testTool(toolName, config);
        if (result) passed++;
    }

    console.log(`\n===================================`);
    console.log(`Test Summary: ${passed}/${total} tools are fully operational.`);
    console.log(`===================================`);
}

runTests();