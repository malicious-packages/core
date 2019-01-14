// NOTE: no module-alias here, because it breaks isGloballyAvailableModule method
import fs from 'fs';
import 'longjohn';
import Module from 'module';
import { DiagnosticWithGroup } from './checks/check';
import { DiagnosticType } from './entities/diagnostic';
import { DiagnosticGroup } from './entities/report';
import { waitFor } from './services/utils';

Error.stackTraceLimit = 999;

const [argv0, argv1, packageToCheck, reportFilePath] = process.argv;
process.argv = [argv0, argv1]; // some packages do horrible things with our arguments

const SAFE_METHOD_OVERRIDES = [
    { moduleName: 'core-util-is', propertyName: /inherits/, stackEntry: 'readable-stream' },
    { moduleName: 'fs', propertyName: /.+/, stackEntry: 'graceful-fs' },
    { moduleName: 'fs', propertyName: /close|closeSync/, stackEntry: 'protractor-beautiful-reporter' },
    { moduleName: 'http', propertyName: /get|request/, stackEntry: 'docker-modem/lib/http' },
    { moduleName: 'http', propertyName: /get|request/, stackEntry: 'follow-redirects' },
    { moduleName: 'http', propertyName: /ClientRequest|get|request/, stackEntry: 'nock/lib' },
    { moduleName: 'https', propertyName: /get|request/, stackEntry: 'follow-redirects' },
    { moduleName: 'https', propertyName: /get|request/, stackEntry: 'agent-base' },
    { moduleName: 'https', propertyName: /get|request/, stackEntry: 'docker-modem/lib/http' },
    { moduleName: 'https', propertyName: /get|request/, stackEntry: 'nock/lib' },
    { moduleName: 'colors/safe', propertyName: /enabled/, stackEntry: '' },
    { moduleName: 'commander', propertyName: /.+/, stackEntry: '' },
    { moduleName: 'chinese_convert/cn2tw', propertyName: /.+/, stackEntry: '' },
    { moduleName: 'chalk', propertyName: /.+/, stackEntry: '' },
    { moduleName: 'fs', propertyName: /.+/, stackEntry: 'async-listener' },
    { moduleName: 'timers', propertyName: /.+/, stackEntry: 'async-listener' },
    { moduleName: 'dns', propertyName: /.+/, stackEntry: 'async-listener' },
    { moduleName: 'dns', propertyName: /.+/, stackEntry: 'dnscache/lib' },
    { moduleName: 'crypto', propertyName: /pbkdf2|randomBytes|pseudoRandomBytes/, stackEntry: 'async-listener' },
    { moduleName: 'child_process', propertyName: /fork/, stackEntry: '' },
    { moduleName: 'process', propertyName: /noDeprecation|_maxListeners/, stackEntry: '' },
    { moduleName: 'npmlog', propertyName: /level|maxRecordSize/, stackEntry: '' },
    { moduleName: 'cluster', propertyName: /_eventsCount/, stackEntry: '' },
];
const originalRequire = Module.prototype.require;
const results: DiagnosticWithGroup[] = [];

function isGloballyAvailableModule(id: string) {
    try {
        require.resolve(id);
        return true;
    } catch (e) {
        return false;
    }
}

function addPropertyChangeReport(moduleName: string, target: any, propertyName: string) {
    if (!(propertyName in target)) {
        return;
    }
    if (moduleName.startsWith('./') || moduleName.startsWith('/')) {
        return;
    }

    const stack = new Error().stack!;
    const isWhitelistedChange = SAFE_METHOD_OVERRIDES.some(
        (whitelistEntry) =>
            whitelistEntry.moduleName === moduleName &&
            whitelistEntry.propertyName.test(propertyName) &&
            stack.includes(whitelistEntry.stackEntry)
    );
    if (isWhitelistedChange) {
        return;
    }

    results.push({
        diagnosticGroup: DiagnosticGroup.Initialization,
        diagnostic: {
            type: DiagnosticType.OverridingProperty,
            moduleName,
            propertyName,
        },
    });
}

Module.prototype.require = function(id: string) {
    let resolvedModule: any;
    try {
        // tslint:disable-next-line:no-invalid-this
        resolvedModule = originalRequire.call(this, id);
    } catch (e) {
        // TODO: extract package name from error message and add deduplication
        // // tslint:disable-next-line:no-console
        // console.error(e.message);
        // const isProperMissingModuleError = e.message.startsWith('Cannot find module') && id !== packageToCheck;
        // if (isProperMissingModuleError) {
        //     results.push({
        //         diagnosticGroup: DiagnosticGroup.Initialization,
        //         diagnostic: {
        //             type: DiagnosticType.AccessingMissingPackage,
        //             moduleName: id,
        //         },
        //     });
        // }

        throw e;
    }
    if (!isGloballyAvailableModule(id)) {
        return resolvedModule;
    }
    if (typeof resolvedModule !== 'object') {
        return resolvedModule;
    }

    return new Proxy(resolvedModule, {
        set(target, name, value) {
            if (target[name] === value) {
                return true;
            }

            addPropertyChangeReport(id, target, String(name));
            target[name] = value;
            return true;
        },

        defineProperty(target, name, descriptor) {
            addPropertyChangeReport(id, target, String(name));
            Object.defineProperty(target, name, descriptor);
            return true;
        },
    });
};

function dumpReportToDisk() {
    fs.writeFileSync(reportFilePath, JSON.stringify(results, undefined, 4));
}

const timeoutTimerId = setTimeout(() => {
    // tslint:disable-next-line:no-console
    console.error(`Runner: require timeout`);
    process.exit(0);
}, 15 * 1000);

process.on('exit', (code) => {
    if (code !== 0) {
        // tslint:disable-next-line:no-console
        console.info(`Exit with non-ok code (${code}) was prevented`);
    }
    dumpReportToDisk();
    process.exitCode = 0;
});

(async function start() {
    try {
        // tslint:disable-next-line:no-var-requires
        require(packageToCheck);
    } catch (e) {
        // noop
    } finally {
        await waitFor(1000);
        clearTimeout(timeoutTimerId);
        process.exit(0);
    }
})();
