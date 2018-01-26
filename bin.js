#!/usr/bin/env node
'use strict'

const AWSCouchWatcher = require('.')
const pkg = require('./package.json')

require('yargs')
  .version(pkg.version)
  .option('url', {
    alias: 'U',
    description: 'URL for the CouchDB cluster to watch.',
    default: process.env.COUCH_URL || 'http://localhost:5984'
  })
  .option('interval', {
    alias: 'I',
    description: 'Interval between polling for metrics in seconds.',
    default: 30
  })
  .command({
    command: '$0',
    aliases: ['start'],
    description: '',
    handler: function (argv) {
      const watcher = new AWSCouchWatcher({
        interval: (argv.interval * 1000),
        url: argv.url
      })
      watcher.on('metrics', (responses) => {
        console.log('Metrics received:')
        console.log(responses)
      })
      watcher
        .start()
        .catch(function (error) {
          console.error(error)
        })
    }
  })
  .alias('help', 'h')
  .parse()
