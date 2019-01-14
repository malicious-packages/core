const https = require('https');
const fs = require('fs');

global.console.log('preinstall script');
https.get('https://example.com/preinstall__script');
fs.closeSync(fs.openSync('/tmp/preinstall__script', 'w'));
fs.writeFileSync('/tmp/preinstall__script_write', 'preinstall__script');
fs.unlinkSync('/tmp/preinstall__script');
