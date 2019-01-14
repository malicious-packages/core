FROM node:10 as builder

WORKDIR /opt/builder

COPY package.json /opt/builder/package.json
COPY package-lock.json /opt/builder/package-lock.json
RUN npm i

COPY tsconfig.json /opt/builder/tsconfig.json
COPY src /opt/builder/src

RUN npm run build
RUN npm prune --production

FROM node:10-alpine

WORKDIR /opt/producer

RUN apk add --no-cache bash

COPY docker /opt/producer/docker
COPY --from=builder /opt/builder/node_modules /opt/producer/node_modules
COPY --from=builder /opt/builder/package.json /opt/producer/package.json
COPY --from=builder /opt/builder/dist /opt/producer/src

CMD ["./docker/producer/init.sh"]
