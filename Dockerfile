FROM node:14-alpine as build

ENV BEACON_URL=http://localhost:9596
ENV IPFS_URL=http://localhost:5001
ENV ROOT_DIR=/data/

WORKDIR /usr/app

COPY package.json yarn.lock ./
RUN yarn install --non-interactive --frozen-lockfile --ignore-scripts

COPY . .
RUN yarn install --non-interactive --frozen-lockfile

FROM node:14-alpine
WORKDIR /usr/app
COPY --from=build /usr/app .

ENTRYPOINT ["node", "./lib/index.js"]
