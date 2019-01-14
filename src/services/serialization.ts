import { checkerConfig } from 'config';
import {
    CommandExecutionDiagnostic,
    Diagnostic,
    DiagnosticGroup,
    DiagnosticType,
    FilesystemAccessDiagnostic,
    OverridingModulePropertyDiagnostic,
    Report,
} from 'entities';

export function serializeReport(report: Report): object {
    return Object.keys(DiagnosticGroup).reduce(
        (acc, group) => {
            acc[group] = report.getDiagnostics(group as DiagnosticGroup).map(serializeDiagnostic);
            return acc;
        },
        {} as any
    );
}

export function deserializeReport(reportString: string) {
    const reportObject = JSON.parse(reportString);
    const report = new Report();
    (Object.keys(DiagnosticGroup) as DiagnosticGroup[]).forEach((diagnosticGroup) => {
        reportObject[diagnosticGroup].forEach((diagnistic: Diagnostic) =>
            report.addDiagnostic(diagnosticGroup, diagnistic)
        );
    });

    return report;
}

function serializeDiagnostic(diagnostic: Diagnostic) {
    switch (diagnostic.type) {
        case DiagnosticType.CommandExecution:
            return serializeCommandExecutionDiagnostic(diagnostic);
        case DiagnosticType.FilesystemAccess:
            return serializeFilesystemAccessDiagnostic(diagnostic);
        case DiagnosticType.OverridingProperty:
            return serializeOverridingModulePropertyDiagnostic(diagnostic);
        default:
            return diagnostic;
    }
}

function serializeCommandExecutionDiagnostic(diagnistic: CommandExecutionDiagnostic) {
    return {
        ...diagnistic,
        commandName: diagnistic.commandName.replace(checkerConfig.basePath, '<working-directory>'),
        args: diagnistic.args.map((arg) => arg.replace(checkerConfig.basePath, '<working-directory>')),
    };
}

function serializeFilesystemAccessDiagnostic(diagnostic: FilesystemAccessDiagnostic) {
    return { ...diagnostic, fileName: diagnostic.fileName.replace(checkerConfig.basePath, '<working-directory>') };
}

function serializeOverridingModulePropertyDiagnostic(diagnostic: OverridingModulePropertyDiagnostic) {
    return { ...diagnostic, moduleName: diagnostic.moduleName.replace(checkerConfig.basePath, '<working-directory>') };
}
