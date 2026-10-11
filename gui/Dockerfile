FROM node:22.9.0-alpine3.20 AS vendor

WORKDIR /opt/service

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --no-audit --no-fund

# Only what the page loads, from the packages that own it.
RUN mkdir -p vendor \
	&& cp node_modules/@unum-pillars/uikit/dist/css/uikit.min.css \
	      node_modules/@unum-pillars/uikit/dist/js/uikit.min.js \
	      node_modules/@unum-pillars/uikit/dist/js/uikit-icons.min.js \
	      node_modules/dot/doT.min.js \
	      node_modules/dotroute/src/doTRoute.js \
	      node_modules/@relations-dil/dotroute/dist/relations.js \
	      vendor/

FROM nginx:1.19.6-alpine

RUN mkdir -p /opt/service

WORKDIR /opt/service

COPY nginx/default.conf /etc/nginx/conf.d/
COPY www www
COPY --from=vendor /opt/service/vendor www/vendor
