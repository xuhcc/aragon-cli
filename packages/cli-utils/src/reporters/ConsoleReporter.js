const chalk = require('chalk')
const figures = require('figures')

module.exports = class ConsoleReporter {
  static get DEBUG_ICON() {
    return chalk.magenta(figures.pointer)
  } 
  static get INFO_ICON() {
    return chalk.blue(figures.info)
  } 
  static get WARNING_ICON() {
    return chalk.yellow(figures.warning)
  } 
  static get ERROR_ICON() {
    return chalk.red(figures.cross)
  } 
  static get SUCCESS_ICON() {
    return chalk.green(figures.tick)
  } 
 
  constructor(options) {
    const defaultOptions = {
      silent: false,
      debug: false
    }
    this.opts = Object.assign({}, defaultOptions, options)
  }

  message (...messages) {
    if (this.opts.silent) return

    console.log(...messages)
  }

  debug (...messages) {
    if (!this.opts.debug) return

    this.message(DEBUG_ICON, ...messages)
  }

  info (...messages) {
    this.message(INFO_ICON, ...messages)
  }

  warning (...messages) {
    this.message(WARNING_ICON, ...messages)
  }

  error (...messages) {
    this.message(ERROR_ICON, ...messages)
  }

  success (...messages) {
    this.message(SUCCESS_ICON, ...messages)
  }

  newLine () {
    this.message()
  }
}
