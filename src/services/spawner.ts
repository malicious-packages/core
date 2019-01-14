import * as childProcess from 'child_process';

export interface SpawnOptions {
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    logStdout?: boolean;
    ignoreExitCode?: boolean;
}

export function spawn(binaryName: string, args: string[], customOptions?: SpawnOptions) {
    const options = { env: undefined, cwd: undefined, logStdout: true, ignoreExitCode: false, ...customOptions };

    const command = childProcess.spawnSync(binaryName, args, {
        env: Object.assign({}, process.env, options.env),
        cwd: options.cwd,
        stdio: ['ignore', 'inherit', 'inherit'],
        killSignal: 9,
        timeout: 300 * 1000,
    });

    if (command.stdout && options.logStdout) {
        global.console.log(command.stdout.toString());
    }
    if (command.stderr) {
        global.console.error(command.stderr.toString());
    }

    if (command.error) {
        throw command.error;
    }

    if (!options.ignoreExitCode && command.status !== 0) {
        throw new Error(`Command ${binaryName} ${args.join(' ')} has terminated with code ${command.status}`);
    }
}
