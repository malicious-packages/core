const https = require('https');
const fs = require('fs');

global.console.log('postuninstall script');
https.get('https://example.com/postuninstall__script');
fs.closeSync(fs.openSync('/tmp/postuninstall__script', 'w'));
fs.writeFileSync('/tmp/postuninstall__script_write', 'postuninstall__script');
fs.unlinkSync('/tmp/postuninstall__script');
