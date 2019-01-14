const https = require('https');
const fs = require('fs');

global.console.log('postinstall script');
https.get('https://example.com/postinstall__script');
fs.closeSync(fs.openSync('/tmp/postinstall__script', 'w'));
fs.writeFileSync('/tmp/postinstall__script_write', 'postinstall__script');
fs.unlinkSync('/tmp/postinstall__script');
