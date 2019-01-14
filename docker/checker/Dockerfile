FROM node:10

WORKDIR /opt/checker

RUN apt-get update \
    && apt-get -y install strace git sudo unzip

COPY docker/checker/init.sh /opt/checker/init.sh
COPY mitmproxy-ca-cert.crt /opt/checker/mitmproxy-ca-cert.crt
COPY mitmproxy-ca-cert.pem /opt/checker/mitmproxy-ca-cert.pem
RUN cp /opt/checker/mitmproxy-ca-cert.crt /usr/local/share/ca-certificates/mitmproxy-ca-cert.crt
RUN update-ca-certificates
ENV NODE_EXTRA_CA_CERTS=/opt/checker/mitmproxy-ca-cert.pem

RUN cat /dev/zero | ssh-keygen -q -N ""
RUN git init
RUN echo "//registry.npmjs.org/:_authToken=MY_SUPER_SECRET_TOKEN" > .npmrc
RUN echo "NPM_AUTH_TOKEN=MY_SUPER_SECRET_TOKEN" > .env
COPY package.json /opt/checker/package.json
COPY node_modules /opt/checker/node_modules
COPY test_package /opt/checker/test_package
COPY src /opt/checker/src

CMD ["./init.sh"]
