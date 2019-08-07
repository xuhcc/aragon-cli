import TaskList from 'listr'
//
import {
  ensureConnection,
  getMerkleDAG,
  extractCIDsFromMerkleDAG,
  propagateFiles,
} from '../lib'
import listrOpts from '@aragon/cli-utils/src/helpers/listr-options'

const chalk = require('chalk')
const startIPFS = require('./start')

export const command = 'propagate <cid>'
export const describe =
  'Request the content and its links at several gateways, making the files more distributed within the network.'

export const builder = yargs => {
  return yargs.positional('cid', {
    description: 'A self-describing content-addressed identifier',
  })
}

const runPropagateTask = ({ apmOptions, silent, debug, cid }) => {
  return new TaskList(
    [
      {
        title: 'Check IPFS',
        task: () => startIPFS.task({ apmOptions }),
      },
      {
        title: 'Connect to IPFS',
        task: async ctx => {
          ctx.ipfs = await ensureConnection(apmOptions.ipfs.rpc)
        },
      },
      {
        title: 'Fetch the links',
        task: async ctx => {
          ctx.data = await getMerkleDAG(ctx.ipfs.client, cid, {
            recursive: true,
          })
        },
      },
      {
        title: 'Query gateways',
        task: async (ctx, task) => {
          ctx.CIDs = extractCIDsFromMerkleDAG(ctx.data, {
            recursive: true,
          })

          const logger = text => (task.output = text)
          ctx.result = await propagateFiles(ctx.CIDs, logger)
        },
      },
    ],
    listrOpts(silent, debug)
  ).run()
}

export const handler = async argv => {
  const {
    reporter,
    apm: apmOptions, // TODO
    cid,
    debug,
    silent,
  } = argv

  const ctx = await runPropagateTask({
    apmOptions,
    cid,
    debug,
    silent,
  })

  console.log(
    '\n',
    `Queried ${chalk.blue(ctx.CIDs.length)} CIDs at ${chalk.blue(
      ctx.result.gateways.length
    )} gateways`,
    '\n',
    `Requests succeeded: ${chalk.green(ctx.result.succeeded)}`,
    '\n',
    `Requests failed: ${chalk.red(ctx.result.failed)}`,
    '\n'
  )

  reporter.debug(`Gateways: ${ctx.result.gateways.join(', ')}`)
  reporter.debug(
    `Errors: \n${ctx.result.errors.map(JSON.stringify).join('\n')}`
  )
  // TODO add your own gateways
  process.exit()
}
