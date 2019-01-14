FROM node:10 as builder

WORKDIR /opt/builder

COPY package.json /opt/builder/package.json
COPY package-lock.json /opt/builder/package-lock.json
RUN npm i

COPY tsconfig.json /opt/builder/tsconfig.json
COPY tests /opt/builder/tests
COPY src /opt/builder/src

RUN npm run build
RUN npm prune --production

FROM docker:dind
RUN apk add --no-cache \
    python3 \
    python3-dev \
    musl-dev \
    libffi-dev \
    openssl-dev \
    libc-dev \
    gcc \
    iptables \
    dumb-init \
    musl \
    libc6-compat \
    linux-headers \
    build-base \
    bash \
    git \
    ca-certificates \
    libssl1.0 \
    readline-dev \
    zlib-dev \
    bzip2-dev \
    sqlite-dev \
    openssl-dev \
    openssl \
    nodejs \
    nodejs-npm \
    && \
    python3 -m ensurepip && \
    rm -r /usr/lib/python*/ensurepip && \
    pip3 install --upgrade pip setuptools && \
    if [ ! -e /usr/bin/pip ]; then ln -s pip3 /usr/bin/pip ; fi && \
    if [[ ! -e /usr/bin/python ]]; then ln -sf /usr/bin/python3 /usr/bin/python; fi && \
    rm -r /root/.cache
RUN pip3 install mitmproxy

WORKDIR /opt/consumer

RUN mkdir logs
RUN mkdir mitmdump_logs
RUN mkdir ~/.mitmproxy
RUN echo 'dump_destination: "/opt/consumer/mitmdump_logs/mitmdump.txt"' > ~/.mitmproxy/config.yaml

COPY docker /opt/consumer/docker
COPY --from=builder /opt/builder/package.json /opt/consumer/package.json
COPY --from=builder /opt/builder/node_modules /opt/consumer/node_modules
COPY --from=builder /opt/builder/tests/test_package /opt/consumer/test_package
COPY --from=builder /opt/builder/dist/src /opt/consumer/src

CMD ["./docker/consumer/init.sh"]
