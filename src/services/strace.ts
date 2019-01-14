import { checkerConfig } from 'config';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, SpawnOptions } from 'services/spawner';
import * as tmp from 'tmp';

interface Syscall {
    name: string;
    args: string[];
}

const SYSCALL_REGEX = /\d+\s+(\w+)\(([^){]+)/;
const SYGNAL_REGEX = /\d+\s+(\+|-)+/;
const ARGUMENT_SANITIZE_REGEX = /^"?\[?"?([^"]+)/;

export enum FilesystemOperationType {
    Access = 'Access',
    Remove = 'Remove',
    Rename = 'Rename',
    Execute = 'Execute',
}

const SAFE_ACCESS_PATHS = [
    '/',
    '.',
    '..',
    '/opt',
    '/etc/hosts',
    '/etc/resolv.conf',
    '/etc/gai.conf',
    '/etc/host.conf',
    '/etc/localtime',
    '/etc/nsswitch.conf',
    '/etc/ssl/certs/ca-certificates.crt',
    '/etc/ld.so.cache',
    '/proc/sys/vm/overcommit_memory',
    '/proc/filesystems',
    '/proc/cpuinfo',
    '/proc/stat',
    '/proc/version',
    '/usr/lib/ssl/openssl.cnf',
    '/usr/local/bin/node',
    '/sys/devices/system/cpu/online',
    path.resolve(checkerConfig.basePath, 'mitmproxy-ca-cert.pem'),
    path.resolve(checkerConfig.basePath, 'package.json'),
    checkerConfig.basePath,
];

const SAFE_ACCESS_PATHS_PREFIXES = [
    '/dev',
    '/root/.config',
    '/root/.npm',
    '/root/.node-gyp',
    '/lib/x86_64-linux-gnu',
    '/usr/local/lib',
    '/usr/local/share',
    '/usr/lib/x86_64-linux-gnu',
    '/usr/lib/sudo',
    '/usr/include',
    '/usr/local/include',
    '/usr/lib/python2.7',
    '/usr/lib/gcc/',
    '/etc/pam.d/',
    '/etc/ssl/certs',
    path.resolve(checkerConfig.basePath, 'node_modules'),
    path.resolve(checkerConfig.basePath, 'test_package'),
];

const SAFE_RENAME_PATHS_PREFIXES = ['/root/.npm/_logs/', '/root/.config/configstore'];

const SAFE_REMOVE_PATHS_PREFIXES = ['/root/.npm'];

export type FilesystemOperation =
    | FilesystemAccessOperation
    | FilesystemRemoveOperation
    | FilesystemRenameOperation
    | FilesystemExecuteOperation;

interface FilesystemAccessOperation {
    type: FilesystemOperationType.Access;
    fileName: string;
}

interface FilesystemRemoveOperation {
    type: FilesystemOperationType.Remove;
    fileName: string;
}

interface FilesystemRenameOperation {
    type: FilesystemOperationType.Rename;
    fileName: string;
}

interface FilesystemExecuteOperation {
    type: FilesystemOperationType.Execute;
    commandName: string;
    args: string[];
}

export function spawnWithFilesystemTracing(binaryName: string, args: string[], customOptions?: SpawnOptions) {
    const tempFileName = tmp.tmpNameSync();
    spawn(
        'strace',
        [
            '-f',
            '-s',
            '2048',
            '-e',
            'trace=open,openat,rename,execve,unlink,unlinkat,rmdir',
            '-o',
            tempFileName,
            binaryName,
            ...args,
        ],
        customOptions
    );
    const straceLog = fs.readFileSync(tempFileName).toString();
    return extractFilesystemOperations(straceLog);
}

export function removePathMentions(operations: FilesystemOperation[], pathName: string) {
    return operations.filter(
        (operation) => operation.type === FilesystemOperationType.Execute || !operation.fileName.startsWith(pathName)
    );
}

export function extractFilesystemOperations(straceLog: string): FilesystemOperation[] {
    const syscalls = extractSyscalls(straceLog.split('\n'));

    const scriptsList = new Set<string>();
    const result: FilesystemOperation[] = [];
    for (const syscall of syscalls) {
        const filesystemOperation = syscallToFilesystemOperation(syscall);
        const stringifiedOperation = JSON.stringify(filesystemOperation);
        if (!filesystemOperation || isJunkOperation(filesystemOperation) || scriptsList.has(stringifiedOperation)) {
            continue;
        }

        result.push(filesystemOperation);
        scriptsList.add(stringifiedOperation);
    }

    return result;
}

function syscallToFilesystemOperation(syscall: Syscall): FilesystemOperation | null {
    switch (syscall.name) {
        case 'open':
            return { type: FilesystemOperationType.Access, fileName: syscall.args[0] };
        case 'openat':
            return { type: FilesystemOperationType.Access, fileName: syscall.args[1] };
        case 'rename':
            return { type: FilesystemOperationType.Rename, fileName: syscall.args[0] };
        case 'execve':
            const [commandName, ...args] = syscall.args;
            return { type: FilesystemOperationType.Execute, commandName, args };
        case 'unlink':
        case 'rmdir':
            return { type: FilesystemOperationType.Remove, fileName: syscall.args[0] };
        case 'unlinkat':
            return { type: FilesystemOperationType.Remove, fileName: syscall.args[1] };
        default:
            throw new Error(`Unknown syscall: ${JSON.stringify(syscall)}`);
    }
}

function extractSyscalls(logLines: string[]): Syscall[] {
    const syscallLogLines = logLines.filter(isSuccessfulOperation).filter(isSyscallLog);

    return syscallLogLines.map((logLine) => {
        const matches = logLine.trim().match(SYSCALL_REGEX);
        if (!matches) {
            throw new Error(`Cannot parse syscall string: ${logLine}`);
        }

        return {
            name: matches[1],
            args: matches[2]
                .split(', ')
                .filter(isProperArgument)
                .map(sanitizeArgument),
        };
    });
}

function isSuccessfulOperation(logLine: string) {
    return !logLine.endsWith('= -1 ENOENT (No such file or directory)');
}

function isSyscallLog(logLine: string) {
    return logLine.length > 0 && !SYGNAL_REGEX.test(logLine) && !logLine.includes('<...');
}

function isProperArgument(arg: string) {
    return arg.length > 0 && arg !== '"' && arg !== '""' && !arg.includes('/*');
}

function sanitizeArgument(arg: string) {
    const matches = arg.match(ARGUMENT_SANITIZE_REGEX);
    if (!matches) {
        throw new Error(`Cannot sanitize argument: ${arg}`);
    }

    return matches[1];
}

function isJunkOperation(operation: FilesystemOperation) {
    switch (operation.type) {
        case FilesystemOperationType.Access:
            return isJunkFilesystemAccessOperation(operation);
        case FilesystemOperationType.Rename:
            return isJunkFilesystemRenameOperation(operation);
        case FilesystemOperationType.Remove:
            return isJunkFilesystemRemoveOperation(operation);
        default:
            return false;
    }
}

function isJunkFilesystemOperation(
    operation: FilesystemAccessOperation | FilesystemRenameOperation | FilesystemRemoveOperation
) {
    return !operation.fileName.startsWith('/');
}

function isJunkFilesystemAccessOperation(operation: FilesystemAccessOperation) {
    if (isJunkFilesystemOperation(operation)) {
        return true;
    }

    const { fileName } = operation;

    return (
        SAFE_ACCESS_PATHS.some((safePath) => fileName === safePath) ||
        SAFE_ACCESS_PATHS_PREFIXES.some((safePathPrefix) => fileName.startsWith(safePathPrefix))
    );
}

function isJunkFilesystemRenameOperation(operation: FilesystemRenameOperation) {
    if (isJunkFilesystemOperation(operation)) {
        return true;
    }

    const { fileName } = operation;

    return SAFE_RENAME_PATHS_PREFIXES.some((safePathPrefix) => fileName.startsWith(safePathPrefix));
}

function isJunkFilesystemRemoveOperation(operation: FilesystemRemoveOperation) {
    if (isJunkFilesystemOperation(operation)) {
        return true;
    }

    const { fileName } = operation;

    return SAFE_REMOVE_PATHS_PREFIXES.some((safePathPrefix) => fileName.startsWith(safePathPrefix));
}
