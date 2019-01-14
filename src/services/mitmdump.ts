import { checkerConfig } from 'config';
import fs from 'fs';
import path from 'path';

const LOG_FILE_PATH = path.join(checkerConfig.mitmdumpLogsPath, 'mitmdump.txt');

export interface MitmdumpLogEntry {
    url: string;
    requestMethod: string;
    requestHeaders: Record<string, string>;
    requestBody: string;
    status: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
}

export function executeAndCollectMitmdumpLogs<T>(callback: () => T): [MitmdumpLogEntry[], T] {
    const callbackReturnValue = callback();
    const mitmdumpLogs = getLogEntries();
    clearLog();

    return [mitmdumpLogs, callbackReturnValue];
}

export function getLogEntries(): MitmdumpLogEntry[] {
    const logContent = fs.readFileSync(LOG_FILE_PATH).toString();
    const rawLogEntries = logContent
        .split('\n')
        .filter((entryString) => entryString.length > 0)
        .map((entryString) => JSON.parse(entryString));

    return rawLogEntries.map((rawLogEntry) => {
        return {
            url:
                rawLogEntry.request.scheme +
                '://' +
                (rawLogEntry.request.headers.Host || rawLogEntry.request.headers.host || rawLogEntry.request.host) +
                rawLogEntry.request.path,
            requestMethod: rawLogEntry.request.method,
            requestHeaders: rawLogEntry.request.headers,
            requestBody: rawLogEntry.request.content,
            status: rawLogEntry.response.status_code,
            responseHeaders: rawLogEntry.response.headers,
            responseBody: rawLogEntry.response.content,
        };
    });
}

export function clearLog() {
    fs.truncateSync(LOG_FILE_PATH, 0);
}
