export * from './check';

import { Check } from './check';
import { checkPackageInitialization } from './initialization';
import { checkPackageScripts } from './scripts';

export const allChecks: Check[] = [checkPackageScripts, checkPackageInitialization];
