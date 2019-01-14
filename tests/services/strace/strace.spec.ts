import * as fs from 'fs';
import _ from 'lodash';
import * as path from 'path';
import { extractFilesystemOperations } from 'services/strace';

const STRACE_LOG_EXAMPLE = fs.readFileSync(path.resolve(__dirname, 'strace_log.example')).toString();
const BASELINE_FILE_PATH = path.resolve(__dirname, 'baseline.json');

it('can extract filesystem operations from strace log', () => {
    const filesystemOperations = extractFilesystemOperations(STRACE_LOG_EXAMPLE);
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE_PATH).toString());
    fs.writeFileSync(BASELINE_FILE_PATH, JSON.stringify(filesystemOperations, undefined, 4));

    const baselineWasChanged = !_.isEqual(baseline, filesystemOperations);
    if (baselineWasChanged) {
        throw new Error('Strace test: baseline was changed');
    }
});
