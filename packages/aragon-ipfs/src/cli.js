#!/usr/bin/env node

import yargs from 'yargs'
import { reporter } from '@aragon/cli-utils/src/middleware'
//
import * as commands from './commands'
import {
  EXAMPLE,
  EPILOGUE,
  COMMAND_REQUIRED_ERROR,
  HELP_COMMAND_WARNING,
  SCRIPT_NAME
} from './configuration'

yargs
  .usage('$0 <command> [options]')
  .scriptName(SCRIPT_NAME)
  .demandCommand(1, COMMAND_REQUIRED_ERROR)
  .showHelpOnFail(false, HELP_COMMAND_WARNING)
  .help()
  .epilogue(EPILOGUE)
  .example(EXAMPLE)
  .strict()
  .middleware([
    reporter,
    environment
  ])
  // global options 
  .option('silent', {
    boolean: true,
    description: 'Silence all output',
    default: false,
  })
  .option('debug', {
    boolean: true,
    description: 'Show extra output',
    default: false,
  })
  .alias({
    'v': 'version',
    'h': 'help',
    's': 'silent',
    'd': 'debug'
  })
  // aragon environment middleware

  // .option('ipfs.rpc', {
  //   description: 'An URI to the IPFS node used to publish files',
  //   default: 'http://localhost:5001#default',
  // })
  // .option('ipfs.gateway', {
  //   description: 'An URI to the IPFS Gateway to read files from',
  //   default: 'http://localhost:8080/ipfs',
  // })
  // .group(['ipfs.rpc', '.ipfs.gateway'], 'APM providers:')
  .group(['h', 'v', 'd', 's'], 'Global options:')
  // the order matters for --help
  .command(commands.install)
  .command(commands.start)
  .command(commands.status)
  .command(commands.view)
  .command(commands.propagate)
  .command(commands.uninstall)
  .argv
