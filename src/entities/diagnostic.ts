import { FilesystemOperationType } from 'services/strace';

export enum DiagnosticType {
    NetworkRequest = 'NetworkRequest',
    FilesystemAccess = 'FilesystemAccess',
    CommandExecution = 'CommandExecution',
    OverridingProperty = 'OverridingProperty',
    AccessingMissingPackage = 'AccessingMissingPackage',
}

export interface NetworkRequestDiagnostic {
    type: DiagnosticType.NetworkRequest;
    url: string;
    requestMethod: string;
    requestHeaders: Record<string, string>;
    requestBody: string;
    status: number;
    responseHeaders: Record<string, string>;
    responseBody: string;
}

export interface FilesystemAccessDiagnostic {
    type: DiagnosticType.FilesystemAccess;
    operationType: FilesystemOperationType;
    fileName: string;
}

export interface CommandExecutionDiagnostic {
    type: DiagnosticType.CommandExecution;
    commandName: string;
    args: string[];
}

export interface OverridingModulePropertyDiagnostic {
    type: DiagnosticType.OverridingProperty;
    moduleName: string;
    propertyName: string;
}

export interface AccessingMissingModuleDiagnostic {
    type: DiagnosticType.AccessingMissingPackage;
    moduleName: string;
}

export type Diagnostic =
    | NetworkRequestDiagnostic
    | FilesystemAccessDiagnostic
    | CommandExecutionDiagnostic
    | OverridingModulePropertyDiagnostic
    | AccessingMissingModuleDiagnostic;
