import { Diagnostic, DiagnosticGroup } from 'entities';
import { PackageMetadata } from 'services/package_metadata';

export interface DiagnosticWithGroup {
    diagnosticGroup: DiagnosticGroup;
    diagnostic: Diagnostic;
}

export type Check = (packageMetadata: PackageMetadata) => DiagnosticWithGroup[];
