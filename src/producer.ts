import 'module-alias/register';

import envalid from 'envalid';
import fetch from 'node-fetch';
import { buildMessageProducer } from 'services/rabbitmq';
import { waitFor } from 'services/utils';

interface PackageData {
    name: string;
    'dist-tags': {
        latest: string;
    };
    time: {
        modified: string;
    };
}

type NpmModifiedPackagesResponse = Record<string, PackageData>;

const env = envalid.cleanEnv(process.env, {
    RABBITMQ_CONNECTION_STRING: envalid.str(),
});
const FETCH_DELAY_SECONDS = 25;
const BATCH_SIZE = 100;

let lastProcessedPackageModifiedDate = Date.now();
const lastProcessedPackages = new Set<string>();

function getPackageId(packageData: PackageData) {
    return `${packageData.name}@${packageData['dist-tags'].latest}`;
}

async function* trackNewPackages() {
    for (;;) {
        try {
            const response = await fetch(
                `https://skimdb.npmjs.com/registry/_design/app/_list/index/modified?&limit=${BATCH_SIZE}&startkey=${lastProcessedPackageModifiedDate}`
            );
            const lastModifiedPackages: NpmModifiedPackagesResponse = await response.json();
            const newPackages = Object.keys(lastModifiedPackages)
                .filter((packageName) => packageName !== '_updated')
                .map((packageName) => lastModifiedPackages[packageName]);

            for (const newPackage of newPackages) {
                const packageId = getPackageId(newPackage);
                if (!lastProcessedPackages.has(packageId)) {
                    yield { packageName: newPackage.name, packageVersion: newPackage['dist-tags'].latest };
                    lastProcessedPackages.add(packageId);
                }
            }

            if (lastProcessedPackages.size > 1e6) {
                lastProcessedPackages.clear();
            }

            lastProcessedPackageModifiedDate = Math.min(
                // just a random guess, because there is no sane way to determine new lastProcessedPackageModifiedDate if we're working in the past
                lastProcessedPackageModifiedDate + BATCH_SIZE * 20 * 1000,
                Date.now()
            );

            if (newPackages.length !== BATCH_SIZE) {
                await waitFor(FETCH_DELAY_SECONDS * 1000);
            } else {
                await waitFor((FETCH_DELAY_SECONDS / 10) * 1000);
            }
        } catch (e) {
            // tslint:disable-next-line:no-console
            console.error(`Error while fetching new messages: ${e.message}`);
        }
    }
}

async function start() {
    const messageProducer = await buildMessageProducer(env.RABBITMQ_CONNECTION_STRING);
    for await (const packageData of trackNewPackages()) {
        // tslint:disable-next-line:no-console
        console.info(`New package detected: ${JSON.stringify(packageData)}`);
        messageProducer(packageData);
    }
}

start();
