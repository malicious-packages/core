#!/bin/bash

set -e

dockerd-entrypoint.sh > /dev/null 2>&1 &
mitmdump --mode transparent --showhost -s ./docker/consumer/jsondump.py > /dev/null 2>&1 &
while [ ! -f ~/.mitmproxy/mitmproxy-ca-cert.pem ]
do
    sleep 0.5
done

openssl x509 -in ~/.mitmproxy/mitmproxy-ca-cert.pem -inform PEM -out ~/.mitmproxy/mitmproxy-ca-cert.crt
cp ~/.mitmproxy/mitmproxy-ca-cert.crt /usr/local/share/ca-certificates/mitmproxy-ca-cert.crt
update-ca-certificates
cp ~/.mitmproxy/mitmproxy-ca-cert.crt /opt/consumer/mitmproxy-ca-cert.crt
cp ~/.mitmproxy/mitmproxy-ca-cert.pem /opt/consumer/mitmproxy-ca-cert.pem

iptables -t nat -A PREROUTING -i docker0 -p tcp --dport 80 -j REDIRECT --to-port 8080
iptables -t nat -A PREROUTING -i docker0 -p tcp --dport 443 -j REDIRECT --to-port 8080

docker volume create npm_cache
docker build -f docker/checker/Dockerfile -t checker:latest .

if [[ -v WAIT_FOR_DEPS ]]; then
    ./docker/wait-for-it.sh rabbitmq:5672 -- ./docker/wait-for-it.sh mongodb:27017 -- npm run start:consumer
else
    npm run start:consumer
fi
