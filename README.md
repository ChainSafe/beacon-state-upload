# Beacon State Upload

Upload finalized beacon state to IPFS

## Usage

CLI
```bash
yarn build
node ./lib/index.js <beacon_url> <ipfs_url>
```

Docker Usage
```bash
docker build . -t eth2-state-upload:latest
docker run -e BEACON_URL=<url> -e IPFS_URL=<url> eth2-state-upload:latest
```

## License

MIT
