FROM node:22.9.0-alpine3.20

RUN mkdir -p /opt/service

WORKDIR /opt/service

COPY package.json package-lock.json ./

# build.js and lib/ aren't copied yet, so skip this package's own prepare (the build).
RUN npm ci --ignore-scripts

COPY build.js eslint.config.js ./
COPY lib lib
