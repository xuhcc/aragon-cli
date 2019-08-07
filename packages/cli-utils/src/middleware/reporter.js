import ConsoleReporter from '../reporters/ConsoleReporter'

export const reporter = argv => {
  const { silent, debug } = argv
  argv.reporter = new ConsoleReporter({ silent, debug })

  reporter.debug('argv', argv)
}
