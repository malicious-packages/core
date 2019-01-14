import { CommandExecutionDiagnostic, DiagnosticGroup, DiagnosticType, FilesystemAccessDiagnostic } from 'entities';
import { executeAndCollectMitmdumpLogs } from 'services/mitmdump';
import { PackageMetadata } from 'services/package_metadata';
import {
    FilesystemOperation,
    FilesystemOperationType,
    removePathMentions,
    spawnWithFilesystemTracing,
} from 'services/strace';
import { DiagnosticWithGroup } from './check';

const KNOWN_INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];
const KNOWN_UNINSTALL_SCRIPTS = ['preuninstall', 'postuninstall'];

export function checkPackageScripts(packageMetadata: PackageMetadata) {
    if (!packageMetadata.packageJson.scripts) {
        return [];
    }

    const scriptsToCheck: string[] = [];
    const hasInstallScripts = !!packageMetadata.packageJson.scripts!.install;
    if (hasInstallScripts) {
        scriptsToCheck.push('install');
    } else {
        scriptsToCheck.push(
            ...KNOWN_INSTALL_SCRIPTS.filter((scriptName) => !!packageMetadata.packageJson.scripts![scriptName])
        );
    }

    scriptsToCheck.push(
        ...KNOWN_UNINSTALL_SCRIPTS.filter((scriptName) => !!packageMetadata.packageJson.scripts![scriptName])
    );
    if (scriptsToCheck.length === 0) {
        return [];
    }

    const results: DiagnosticWithGroup[] = [];
    scriptsToCheck.forEach((scriptName) => {
        const diagnosticGroup = KNOWN_INSTALL_SCRIPTS.includes(scriptName)
            ? DiagnosticGroup.InstallScripts
            : DiagnosticGroup.UninstallScripts;

        const runScript = () =>
            spawnWithFilesystemTracing(`npm`, ['run', '--prefix', packageMetadata.packageDirectory, scriptName], {
                ignoreExitCode: true,
            });

        const [mitmdumpLogs, straceLogs] = executeAndCollectMitmdumpLogs(runScript);
        const filteredStraceLogs = removeNpmRunScriptLogs(
            removePathMentions(straceLogs, packageMetadata.packageDirectory),
            packageMetadata
        );

        mitmdumpLogs.forEach((logEntry) => {
            results.push({
                diagnosticGroup,
                diagnostic: {
                    type: DiagnosticType.NetworkRequest,
                    ...logEntry,
                },
            });
        });

        filteredStraceLogs.forEach((logEntry) => {
            const diagnostic: FilesystemAccessDiagnostic | CommandExecutionDiagnostic =
                logEntry.type === FilesystemOperationType.Execute
                    ? { ...logEntry, type: DiagnosticType.CommandExecution }
                    : {
                          type: DiagnosticType.FilesystemAccess,
                          operationType: logEntry.type,
                          fileName: logEntry.fileName,
                      };

            results.push({
                diagnosticGroup,
                diagnostic,
            });
        });
    });

    return results;
}

function removeNpmRunScriptLogs(straceLogs: FilesystemOperation[], packageMetadata: PackageMetadata) {
    return straceLogs.filter((logEntry) => {
        if (logEntry.type !== FilesystemOperationType.Execute) {
            return true;
        }

        return [...KNOWN_INSTALL_SCRIPTS, ...KNOWN_UNINSTALL_SCRIPTS].every((scriptName) => {
            const scriptContent =
                packageMetadata.packageJson.scripts && packageMetadata.packageJson.scripts[scriptName];
            if (!scriptContent) {
                return true;
            }

            const isScriptInvocation =
                logEntry.args.some((arg) => arg.includes(`scripts/${scriptName}`)) ||
                (logEntry.args.length === 6 && logEntry.args[0] === 'node' && logEntry.args[5] === scriptName) ||
                (logEntry.args.length === 5 && logEntry.args[0] === 'npm' && logEntry.args[4] === scriptName) ||
                logEntry.args[logEntry.args.length - 1] === scriptContent ||
                logEntry.args.join(' ') === scriptContent;
            return !isScriptInvocation;
        });
    });
}
