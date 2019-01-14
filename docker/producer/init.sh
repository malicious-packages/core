#!/bin/bash

set -e

if [[ -v WAIT_FOR_DEPS ]]; then
    ./docker/wait-for-it.sh rabbitmq:5672 -- npm run start:producer
else
    npm run start:producer
fi
