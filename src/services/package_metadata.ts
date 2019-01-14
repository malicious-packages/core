import fs from 'fs';
import path from 'path';

export interface PackageMetadata {
    name: string;
    packageDirectory: string;
    packageJson: PackageJson;
}

interface PackageJson {
    scripts?: Record<string, string>;
}

export function getPackageMetadata(name: string, packageDirectory: string): PackageMetadata {
    const packageJsonPath = path.join(packageDirectory, 'package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath).toString();

    return {
        name,
        packageDirectory,
        packageJson: JSON.parse(packageJsonContent),
    };
}
