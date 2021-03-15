FROM node:12.13-alpine as build

ENV BEACON_URL=http://localhost:9597
ENV IPFS_URL=http://localhost:5001

WORKDIR /usr/app

COPY package.json yarn.lock ./
RUN yarn install --non-interactive --frozen-lockfile --ignore-scripts

COPY . .
RUN yarn install --non-interactive --frozen-lockfile

FROM node:12.13-alpine
WORKDIR /usr/app
COPY --from=build /usr/app .

ENTRYPOINT ["node", "./lib/index.js"]
