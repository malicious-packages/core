const https = require('https');
const fs = require('fs');

global.console.log('preuninstall script');
https.get('https://example.com/preuninstall__script');
fs.closeSync(fs.openSync('/tmp/preuninstall__script', 'w'));
fs.writeFileSync('/tmp/preuninstall__script_write', 'preuninstall__script');
fs.unlinkSync('/tmp/preuninstall__script');
