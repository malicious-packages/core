import * as fs from 'fs';
import _ from 'lodash';
import * as path from 'path';
import { spawn } from 'services/spawner';

const BASE_PATH = path.resolve(__dirname, '..', '..');
const REPORT_FILE_PATH = path.resolve(BASE_PATH, 'logs', 'report.json');
const BASELINE_FILE_PATH = path.resolve(__dirname, 'baseline.json');

it(`still works`, async () => {
    spawn('docker-compose', ['build'], { cwd: BASE_PATH });
    const envVariable = process.env.TEST_PACKAGE
        ? `TEST_PACKAGE=${process.env.TEST_PACKAGE}`
        : 'RUN_INTEGRATION_TEST=true';
    spawn('docker-compose', ['run', '--rm', '-e', envVariable, 'consumer'], { cwd: BASE_PATH });
    const report = JSON.parse(fs.readFileSync(REPORT_FILE_PATH).toString());
    fs.writeFileSync(BASELINE_FILE_PATH, JSON.stringify(report, undefined, 4));
    fs.unlinkSync(REPORT_FILE_PATH);
});
