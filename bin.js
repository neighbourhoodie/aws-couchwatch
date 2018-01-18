#!/usr/bin/env node
'use strict'

const AWSCouchWatcher = require('.')
const pkg = require('./package.json')
const yargs = require('yargs')

yargs
  .version(pkg.version)
  .option('url', {
    alias: 'U',
    description: 'URL for the CouchDB cluster to watch.',
    default: process.env.COUCH_URL || 'http://localhost:5984'
  })
  .command({
    command: '$0',
    aliases: ['start'],
    description: '',
    handler: function (argv) {
      const watcher = new AWSCouchWatcher({ url: argv.url })
      watcher
        .start()
        .then(console.log)
        .catch(console.error)
    }
  })
  .config()
  .alias('help', 'h')
  .wrap(yargs.terminalWidth())
  .parse()
