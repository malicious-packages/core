const https = require('https');
const fs = require('fs');

global.console.log('install script');
https.get('https://example.com/install__script');
fs.closeSync(fs.openSync('/tmp/install__script', 'w'));
fs.writeFileSync('/tmp/install__script_write', 'install__script');
fs.unlinkSync('/tmp/install__script');
