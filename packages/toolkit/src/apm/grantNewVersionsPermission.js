import useApm from './useApm'
import ACL from '../acl/acl'
import { useEnvironment } from '../helpers/useEnvironment'

export default async (
  grantees,
  apmRepoName,
  progressHandler = () => {},
  environment
) => {
  const { web3, gasPrice } = useEnvironment(environment)

  if (grantees.length === 0) {
    throw new Error('No grantee addresses provided')
  }

  const apm = await useApm(environment)

  const acl = ACL(web3)

  progressHandler(1)

  const repo = await apm.getRepository(apmRepoName)
  if (repo === null) {
    throw new Error(
      `Repository ${apmRepoName} does not exist and it's registry does not exist`
    )
  }

  const receipts = []

  /* eslint-disable-next-line */
  for (const address of grantees) {
    progressHandler(2, address)

    // Decode sender
    const accounts = await web3.eth.getAccounts()
    const from = accounts[0]

    // Build transaction
    const transaction = await acl.grant(repo.options.address, address)

    transaction.from = from
    transaction.gasPrice = gasPrice
    // the recommended gasLimit is already calculated by the ACL module

    const receipt = await web3.eth.sendTransaction(transaction)
    progressHandler(3, receipt.transactionHash)

    receipts.push(receipt)
  }

  return receipts
}
