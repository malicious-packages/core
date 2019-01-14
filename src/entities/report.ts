import { Diagnostic } from 'entities/diagnostic';
import _ from 'lodash';

export enum DiagnosticGroup {
    InstallScripts = 'InstallScripts',
    UninstallScripts = 'UninstallScripts',
    Initialization = 'Initialization',
}

export class Report {
    private groups = new Map<DiagnosticGroup, Diagnostic[]>();

    public addDiagnostic(group: DiagnosticGroup, diagnostic: Diagnostic) {
        if (!this.groups.has(group)) {
            this.groups.set(group, []);
        }

        const groupToUse = this.groups.get(group)!;
        const alreadyHasThisDiagnostic = groupToUse.some((existingDiagnostic) =>
            _.isEqual(existingDiagnostic, diagnostic)
        );
        if (alreadyHasThisDiagnostic) {
            return;
        }
        groupToUse.push(diagnostic);
    }

    public getDiagnostics(group: DiagnosticGroup) {
        return this.groups.get(group) || [];
    }

    public isEmpty() {
        return [...this.groups.values()].every((diagnostics) => diagnostics.length === 0);
    }
}
