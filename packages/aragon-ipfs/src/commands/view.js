import TaskList from 'listr'
import listrOpts from '@aragon/cli-utils/src/helpers/listr-options'
//
import {
  ensureConnection,
  getMerkleDAG,
  stringifyMerkleDAG,
} from '../lib'

export const command = 'view <cid>'
export const describe =
  'Display metadata about the content, such as the size, its links, etc.'

export const builder = yargs => {
  // TODO add support for "ipfs paths", e.g: QmP49YSJVhQTySqLDFTzFZPG8atf3CLsQSPDVj3iATQkhC/arapp.json
  return yargs.positional('cid', {
    description: 'A self-describing content-addressed identifier',
  })
}

const runViewTask = ({ apmOptions, silent, debug, cid }) => {
  return new TaskList(
    [
      // TODO validation of the CID
      {
        title: 'Connect to IPFS',
        task: async ctx => {
          ctx.ipfs = await ensureConnection(apmOptions.ipfs.rpc)
        },
      },
      {
        title: 'Fetch the links',
        task: async ctx => {
          ctx.merkleDAG = await getMerkleDAG(ctx.ipfs.client, cid, {
            recursive: true,
          })
        },
      },
    ],
    listrOpts(silent, debug)
  ).run()
}

export const handler = async argv => {
  const {
    reporter,
    apm: apmOptions,
    cid,
    debug,
    silent,
  } = argv

  const ctx = await runViewTask({
    reporter,
    apmOptions,
    cid,
    debug,
    silent,
  })

  reporter.message(stringifyMerkleDAG(ctx.merkleDAG))
}
