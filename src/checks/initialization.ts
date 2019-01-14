import fs from 'fs';
import { PackageMetadata } from 'services/package_metadata';
import { spawn } from 'services/spawner';
import * as tmp from 'tmp';

export function checkPackageInitialization(packageMetadata: PackageMetadata) {
    const tempFileName = tmp.tmpNameSync();
    spawn('npm', ['run', 'start:runner', '--', packageMetadata.name, tempFileName], { ignoreExitCode: true });
    const results = JSON.parse(fs.readFileSync(tempFileName).toString());
    return results;
}
