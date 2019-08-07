import chalk from 'chalk'
import byteSize from 'byte-size'
import { stringifyTree } from 'stringify-tree'
import ipfsAPI from 'ipfs-http-client' // TODO: import only submodules?
import oldIpfsAPI from 'ipfs-api'
import fetch from 'node-fetch'
import { readJson } from 'fs-extra'
import { join as joinPath } from 'path'
import { homedir } from 'os'
import { getBinary, isPortTaken } from '@aragon/cli-utils'
import getFolderSize from 'get-folder-size'
import url from 'url'
import execa from 'execa'
import goplatform from 'go-platform'
import { existsSync } from 'fs'
//
import { FETCH_TIMEOUT_ERR, FETCH_TIMEOUT, IPFS_START_TIMEOUT, GATEWAYS } from './configuration'

export async function ensureConnection (apiAddress) {
  try {
    const client = connectToAPI(apiAddress)
    await client.id()
    return {
      client,
    }
  } catch (error) {
    throw new Error(
      `Could not connect to the IPFS API at ${JSON.stringify(apiAddress)}`
    )
  }
}

export function connectToAPI (apiAddress) {
  return ipfsAPI(apiAddress)
}

export function parseAddressAsURL (address) {
  const uri = new url.URL(address)
  return {
    protocol: uri.protocol.replace(':', ''),
    host: uri.hostname,
    port: parseInt(uri.port),
  }
}

/**
 * Check whether the daemon is running by connecting to the API.
 *
 * @param {URL} apiAddress a `URL` object
 * @returns {boolean} true if it is running
 */
export async function isDaemonRunning (apiAddress) {
  const portTaken = await isPortTaken(apiAddress.port)

  if (!portTaken) {
    return false
  }

  try {
    // if port is taken, connect to the API,
    // otherwise we can assume the port is taken by a different process
    await ensureConnection(apiAddress)
    return true
  } catch (e) {
    return false
  }
}

export async function getMerkleDAG (client, cid, opts = {}) {
  const merkleDAG = parseMerkleDAG(await client.object.get(cid))
  merkleDAG.cid = cid

  if (opts.recursive && merkleDAG.isDir && merkleDAG.links) {
    // fetch the MerkleDAG of each link recursively
    const promises = merkleDAG.links.map(async link => {
      const object = await getMerkleDAG(client, link.cid, opts)
      return Object.assign(link, object)
    })

    return Promise.all(promises).then(links => {
      merkleDAG.links = links
      return merkleDAG
    })
  }

  return merkleDAG
}

// object.get returns an object of type DAGNode
// https://github.com/ipld/js-ipld-dag-pb#dagnode-instance-methods-and-properties
function parseMerkleDAG (dagNode) {
  const parsed = dagNode.toJSON()
  // add relevant data
  parsed.isDir = isDirectory(parsed.data)
  // remove irrelevant data
  delete parsed.data
  if (!parsed.isDir) {
    // if it's a big file it will have links to its other chunks
    delete parsed.links
  }
  return parsed
}

function isDirectory (data) {
  return data.length === 2 && data.toString() === '\u0008\u0001'
}

function stringifyMerkleDAGNode (merkleDAG) {
  // ${merkleDAG.isDir ? '📁' : ''}
  const cid = merkleDAG.cid
  const name = merkleDAG.name || 'root'
  const parsedSize = byteSize(merkleDAG.size)
  const size = parsedSize.value + parsedSize.unit
  const delimiter = chalk.gray(' - ')

  return [name, size, chalk.gray(cid)].join(delimiter)
}

export function stringifyMerkleDAG (merkleDAG) {
  return stringifyTree(
    merkleDAG,
    node => stringifyMerkleDAGNode(node),
    node => node.links
  )
}

export function extractCIDsFromMerkleDAG (merkleDAG, opts = {}) {
  const CIDs = []
  CIDs.push(merkleDAG.cid)

  if (opts.recursive && merkleDAG.isDir && merkleDAG.links) {
    merkleDAG.links
      .map(merkleDAGOfLink => extractCIDsFromMerkleDAG(merkleDAGOfLink, opts))
      .map(CIDsOfLink => CIDs.push(...CIDsOfLink))
  }

  return CIDs
}

function timeout () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(FETCH_TIMEOUT_ERR)
    }, FETCH_TIMEOUT)
  })
}

async function queryCidAtGateway (gateway, cid) {
  try {
    await Promise.race([
      fetch(`${gateway}/${cid}`),
      // Add a timeout because the Fetch API does not implement them
      timeout(),
    ])

    return {
      success: true,
      cid,
      gateway,
    }
  } catch (err) {
    return {
      success: false,
      cid,
      gateway,
      error: err,
    }
  }
}

async function propagateFile (cid, logger) {
  const results = await Promise.all(
    GATEWAYS.map(gateway => queryCidAtGateway(gateway, cid))
  )

  const succeeded = results.filter(status => status.success).length
  const failed = GATEWAYS.length - succeeded

  logger(
    `Queried ${cid} at ${succeeded} gateways successfully, ${failed} failed.`
  )

  const errors = results
    .filter(result => result.error)
    .map(result => result.error)

  return {
    succeeded,
    failed,
    errors,
  }
}

export async function propagateFiles (CIDs, logger = () => { }) {
  const results = await Promise.all(CIDs.map(cid => propagateFile(cid, logger)))
  return {
    gateways: GATEWAYS,
    succeeded: results.reduce((prev, current) => prev + current.succeeded, 0),
    failed: results.reduce((prev, current) => prev + current.failed, 0),
    errors: results.reduce((prev, current) => [...prev, ...current.errors], []),
  }
}

export function getDefaultRepoPath () {
  const homedirPath = homedir()
  return joinPath(homedirPath, '.ipfs')
}

export async function getRepoVersion (repoLocation) {
  const versionFilePath = joinPath(repoLocation, 'version')
  const version = await readJson(versionFilePath)
  return version
}

export async function getRepoSize (repoLocation) {
  return new Promise((resolve, reject) => {
    getFolderSize(repoLocation, (err, size) => {
      if (err) {
        reject(err)
      } else {
        const humanReadableSize = byteSize(size)
        resolve(humanReadableSize)
      }
    })
  })
}

export async function getRepoConfig (repoLocation) {
  const configFilePath = joinPath(repoLocation, 'config')
  const config = await readJson(configFilePath)
  return config
}

export function getPortsConfig (repoConfig) {
  return {
    // default: "/ip4/127.0.0.1/tcp/5001"
    api: repoConfig.Addresses.API.split('/').pop(),
    // default: "/ip4/127.0.0.1/tcp/8080"
    gateway: repoConfig.Addresses.Gateway.split('/').pop(),
    // default: [
    //   "/ip4/0.0.0.0/tcp/4001"
    //   "/ip6/::/tcp/4001"
    // ]
    swarm: repoConfig.Addresses.Swarm[0].split('/').pop(),
  }
}

export function getPeerIDConfig (repoConfig) {
  return repoConfig.Identity.PeerID
}

const ensureIPFSInitialized = async () => {
  if (!getBinary('ipfs')) {
    throw new Error(
      'IPFS is not installed. Use `aragon ipfs install` before proceeding.'
    )
  }

  if (!existsSync(getDefaultRepoPath())) {
    // We could use 'ipfs daemon --init' when https://github.com/ipfs/go-ipfs/issues/3913 is solved
    await execa(getBinary('ipfs'), ['init'])
  }
}

export const startIPFSDaemon = () => {
  if (!getBinary('ipfs')) {
    throw new Error(
      'IPFS is not installed. Use `aragon ipfs install` before proceeding.'
    )
  }

  let startOutput = ''

  // We add a timeout as starting
  const timeout = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(`Starting IPFS timed out:\n${startOutput}`))
    }, IPFS_START_TIMEOUT)
  })

  const start = new Promise(async (resolve, reject) => {
    await ensureIPFSInitialized()
    const ipfsProc = execa(getBinary('ipfs'), ['daemon', '--migrate'])

    ipfsProc.stdout.on('data', data => {
      startOutput = `${startOutput}${data.toString()}\n`
      if (data.toString().includes('Daemon is ready')) resolve()
    })

    ipfsProc.stderr.on('data', data => {
      reject(new Error(`Starting IPFS failed: ${data.toString()}`))
    })
  })

  return Promise.race([start, timeout])
}

let ipfsNode

const IPFSCORS = [
  {
    key: 'API.HTTPHeaders.Access-Control-Allow-Origin',
    value: ['*'],
  },
  {
    key: 'API.HTTPHeaders.Access-Control-Allow-Methods',
    value: ['PUT', 'GET', 'POST'],
  },
]

export const isIPFSCORS = async ipfsRpc => {
  if (!ipfsNode) ipfsNode = oldIpfsAPI(ipfsRpc)
  const conf = await ipfsNode.config.get('API.HTTPHeaders')
  const allowOrigin = IPFSCORS[0].key.split('.').pop()
  const allowMethods = IPFSCORS[1].key.split('.').pop()
  if (conf && conf[allowOrigin] && conf[allowMethods]) {
    return true
  } else {
    throw new Error(`Please set the following flags in your IPFS node:
    ${IPFSCORS.map(({ key, value }) => {
      return `${key}: ${value}`
    }).join('\n    ')}`)
  }
}

export const setIPFSCORS = ipfsRpc => {
  if (!ipfsNode) ipfsNode = oldIpfsAPI(ipfsRpc)
  return Promise.all(
    IPFSCORS.map(({ key, value }) => ipfsNode.config.set(key, value))
  )
}

export const isIPFSRunning = async ipfsRpc => {
  const portTaken = await isPortTaken(ipfsRpc.port)

  if (portTaken) {
    if (!ipfsNode) ipfsNode = oldIpfsAPI(ipfsRpc)

    try {
      // if port is taken, attempt to fetch the node id
      // if this errors, we can assume the port is taken
      // by a process other then the ipfs gateway
      await ipfsNode.id()
      return true
    } catch (e) {
      return false
    }
  }

  return false
}

export const getPlatform = () => process.platform
export const getArch = () => process.arch

export const getPlatformForGO = () => goplatform.GOOS
export const getArchForGO = () => goplatform.GOARCH

export const isProject = dir => joinPath(dir, 'package.json')

// https://github.com/ipfs/npm-go-ipfs/blob/master/link-ipfs.js#L8
// https://github.com/ipfs/npm-go-ipfs#publish-a-new-version-of-this-module-with-exact-same-go-ipfs-version
export const cleanVersion = version => version.replace(/-hacky[0-9]+/, '')
export const getDistName = (version, os, arch) => `go-ipfs_v${version}_${os}-${arch}.tar.gz`
