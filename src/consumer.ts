import 'module-alias/register';

import { checkerConfig, commonConfig, consumerConfig } from 'config';
import { Report } from 'entities';
import envalid from 'envalid';
import * as fs from 'fs';
import { MongoClient } from 'mongodb';
import * as path from 'path';
import { buildMessageConsumer } from 'services/rabbitmq';
import { deserializeReport, serializeReport } from 'services/serialization';
import { spawn } from 'services/spawner';

type ReportStatus = 'unverified' | 'verified' | 'auto_verified' | 'unsound' | 'malicious';

const env = envalid.cleanEnv(process.env, {
    RUN_INTEGRATION_TEST: envalid.bool({ default: false }),
    TEST_PACKAGE: envalid.str({ default: '' }),
    RABBITMQ_CONNECTION_STRING: envalid.str(),
    MONGODB_CONNECTION_STRING: envalid.str(),
});

function runChecks(
    packageName: string,
    packageVersion: string,
    installationString = `${packageName}@${packageVersion}`
) {
    const reportFileName = `${packageName}@${packageVersion}-${Date.now()}.json`;
    const reportFilePath = path.resolve(consumerConfig.logsPath, reportFileName);

    spawn('docker', [
        'run',
        '-e',
        `PACKAGE_NAME=${packageName}`,
        '-e',
        `PACKAGE_VERSION=${packageVersion}`,
        '-e',
        `INSTALLATION_STRING=${installationString}`,
        '-e',
        `REPORT_FILENAME=${reportFileName}`,
        '--mount',
        'type=volume,source=npm_cache,target=/root/.npm',
        '--mount',
        `type=bind,source=${consumerConfig.logsPath},target=${checkerConfig.logsPath}`,
        '--mount',
        `type=bind,source=${consumerConfig.mitmdumpLogsPath},target=${checkerConfig.mitmdumpLogsPath}`,
        '--cap-add',
        'SYS_PTRACE',
        '--rm',
        'checker:latest',
    ]);

    const reportFileContent = fs.readFileSync(reportFilePath).toString();
    fs.unlinkSync(reportFilePath);
    return deserializeReport(reportFileContent);
}

function getReportStatus(report: Report): ReportStatus {
    return report.isEmpty() ? 'auto_verified' : 'unverified';
}

function runTestCheckAndExit(
    packageName: string,
    packageVersion: string,
    installationString = `${packageName}@${packageVersion}`
) {
    const report = runChecks(packageName, packageVersion, installationString);
    fs.writeFileSync(
        path.resolve(consumerConfig.hostLogsPath, 'report.json'),
        JSON.stringify(serializeReport(report), undefined, 4)
    );
}

async function start() {
    const mongoClient = new MongoClient(env.MONGODB_CONNECTION_STRING);
    await mongoClient.connect();
    const db = mongoClient.db(commonConfig.mongoDbName);
    const mongoCollection = db.collection(commonConfig.mongoCollectionName);
    await mongoCollection.createIndex({ packageName: 1 }, { unique: true });
    await mongoCollection.createIndex({ 'reports.status': 1 });
    await mongoCollection.createIndex({ 'reports.packageVersion': 1 });

    const messageConsumer = await buildMessageConsumer(env.RABBITMQ_CONNECTION_STRING);
    messageConsumer(async (message) => {
        const { packageName, packageVersion, installationString } = message;
        // tslint:disable-next-line:no-console
        console.info(`Processing new message: ${JSON.stringify(message)}`);
        try {
            await mongoCollection.insertOne({ packageName, reports: [] });
        } catch (e) {
            // document already exists
        }

        const existingReport = await mongoCollection.findOne({
            packageName,
            reports: { $elemMatch: { packageVersion } },
        });
        if (existingReport) {
            // tslint:disable-next-line:no-console
            console.info(`Report for ${packageName}@${packageVersion} already exists, skipping`);
            return;
        }
        const report = runChecks(packageName, packageVersion, installationString);
        await mongoCollection.updateOne(
            { packageName },
            { $push: { reports: { packageVersion, status: getReportStatus(report), report: serializeReport(report) } } }
        );
    });
}

if (env.RUN_INTEGRATION_TEST) {
    runTestCheckAndExit('test_package', '1.0.0', './test_package');
} else if (env.TEST_PACKAGE !== '') {
    const [packageName, packageVersion = 'latest'] = env.TEST_PACKAGE.split('@').slice(-2);
    runTestCheckAndExit(packageName, packageVersion);
} else {
    start();
}
