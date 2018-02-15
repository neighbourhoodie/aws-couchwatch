'use strict'

module.exports = function log () {
  let msg = arguments[0]
  arguments[0] = '[aws-couchwatch] ' + msg
  if (process.env.DEBUG || process.env.LOG) {
    console.log.apply(console, arguments)
  }
}
