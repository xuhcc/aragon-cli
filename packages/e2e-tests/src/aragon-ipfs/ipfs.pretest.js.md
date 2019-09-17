# Snapshot report for `src/aragon-ipfs/ipfs.pretest.js`

The actual snapshot is saved in `ipfs.pretest.js.snap`.

Generated by [AVA](https://ava.li).

## should install ipfs globally (U-IPFS-1A)

> Snapshot 1

    `i Preparing:␊
    Determine platform and architecture [started]␊
    Determine golang distribution [started]␊
    Determine location [started]␊
    Determine platform and architecture [completed]␊
    Determine golang distribution [completed]␊
    Determine location [completed]␊
    ␊
    i Platform & architecture: linux, x64␊
    i IPFS tarball: go-ipfs_v0.4.18_linux-amd64.tar.gz␊
    i IPFS distributions url: https://dist.ipfs.io␊
    i NPM version: 0.4.18-hacky2␊
    i Location: /home/daniel/.npm-global␊
    ␊
    Install IPFS [started]␊
    Install IPFS [completed]␊
    ␊
    ✔ Success!␊
    i Try it out with: ipfs version`

## should show that the ipfs daemon is started

> Snapshot 1

    `Check installations [started]␊
    Check installations [completed]␊
    Check repository [started]␊
    Check repository [completed]␊
    Check the daemon [started]␊
    Check the daemon [completed]␊
    Check CORS [started]␊
    Check CORS [skipped]␊
    Check MultiAddresses [started]␊
    Check MultiAddresses [skipped]␊
    i Local installation: not installed␊
    i Global installation: /home/daniel/.npm-global/bin/ipfs␊
    ␊
    i Repository location: /home/daniel/.ipfs␊
    i Repository version: 7␊
    i Repository size: 11.0 GB␊
    ␊
    i API port: 5001␊
    i Gateway port: 8080␊
    i Swarm port: 4001␊
    ␊
    i PeerID: QmZigtwM27VR1pnZqpEr46N7E47vS3xKR2ha5bCbwDA2UU␊
    i Daemon: stopped`

> Snapshot 2

    'ipfs version 0.4.18'

## should start the ipfs daemon

> Snapshot 1

    `Configure ports [started]␊
    Configure ports [completed]␊
    Start the daemon [started]␊
    Start the daemon [completed]`