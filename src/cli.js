#!/usr/bin/env node
const {
  manifestMiddleware,
  moduleMiddleware
} = require('./middleware')
const {
  findProjectRoot
} = require('./util')
const ConsoleReporter = require('./reporters/ConsoleReporter')
const fs = require('fs')
const Web3 = require('web3')
const { getTruffleConfig, getENSAddress } = require('./helpers/truffle-config')

const MIDDLEWARES = [
  manifestMiddleware,
  moduleMiddleware
]

// Set up commands
const cmd = require('yargs')
  .commandDir('./commands', {
    visit: (cmd) => {
      // Add middlewares
      cmd.middlewares = MIDDLEWARES
      return cmd
    }
  })

// Configure CLI behaviour
cmd.demandCommand(1, 'You need to specify a command')

// Set global options
cmd.option('silent', {
  description: 'Silence output to terminal',
  default: false
})
cmd.option('cwd', {
  description: 'The project working directory',
  default: () => {
    try {
      return findProjectRoot()
    } catch (_) {
      return process.cwd()
    }
  }
})

// Ethereum
cmd.option('network', {
  description: 'The network in your truffle.js that you want to use',
  default: 'development',
  coerce: (network) => {
    const truffleConfig = getTruffleConfig()
    if (truffleConfig) {
      const truffleNetwork = truffleConfig.networks[network]
      if (!truffleNetwork) {
        throw new Error(`Didn't find network ${network} in your truffle.js`)
      }
      let provider
      if (truffleNetwork.provider) {
        provider = truffleNetwork.provider
      } else if (truffleNetwork.host && truffleNetwork.port) {
        provider = new Web3.providers.WebsocketProvider(`ws://${truffleNetwork.host}:${truffleNetwork.port}`)
      } else {
        provider = new Web3.providers.HttpProvider(`http://localhost:8545`)
      }
      truffleNetwork.provider = provider
      truffleNetwork.name = network
      return truffleNetwork
    } else {
      // This means you are running init
      return {}
    }
  },
  conflicts: 'init'
})

// APM
cmd.option('apm.ens-registry', {
  description: 'Address of the ENS registry',
  default: () => process.env.ENS || getENSAddress(cmd.argv.network.name)
})
cmd.group(['apm.ens-registry', 'eth-rpc'], 'APM:')

cmd.option('apm.ipfs.rpc', {
  description: 'An URI to the IPFS node used to publish files',
  default: {
    host: 'ipfs.aragon.network',
    protocol: 'http',
    port: 5001
  }
})
cmd.group('apm.ipfs.rpc', 'APM providers:')


// Add epilogue
cmd.epilogue('For more information, check out https://wiki.aragon.one')

// Run
const reporter = new ConsoleReporter()
cmd.fail((msg, err, yargs) => {
  if (!err) yargs.showHelp()
  reporter.error(msg || err.message || 'An error occurred')
  reporter.debug(err && err.stack)
}).parse(process.argv.slice(2), {
  reporter
})
