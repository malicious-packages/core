import 'module-alias/register';

import { allChecks } from 'checks';
import { checkerConfig } from 'config';
import { Report } from 'entities';
import envalid from 'envalid';
import * as fs from 'fs';
import * as path from 'path';
import { getPackageMetadata } from 'services/package_metadata';
import { serializeReport } from 'services/serialization';

const env = envalid.cleanEnv(process.env, {
    PACKAGE_NAME: envalid.str(),
    REPORT_FILENAME: envalid.str(),
});

const packageMetadata = getPackageMetadata(
    env.PACKAGE_NAME,
    path.resolve(checkerConfig.nodeModulesPath, env.PACKAGE_NAME)
);

const report = new Report();

allChecks.forEach((check) => {
    check(packageMetadata).forEach(({ diagnosticGroup, diagnostic }) =>
        report.addDiagnostic(diagnosticGroup, diagnostic)
    );
});

const logFilePath = path.resolve(checkerConfig.logsPath, env.REPORT_FILENAME);
fs.writeFileSync(logFilePath, JSON.stringify(serializeReport(report), undefined, 4));
