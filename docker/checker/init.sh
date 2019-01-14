#!/bin/bash

set -e

npm install $INSTALLATION_STRING --ignore-scripts --no-optional --no-package-lock --no-audit
> /opt/checker/mitmdump_logs/mitmdump.txt

npm run start:checker
