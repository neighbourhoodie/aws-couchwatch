#!/usr/bin/env node
'use strict'

const AWSCouchWatch = require('.')
const { version } = require('./package.json')

function scanWith (watcher) {
  return watcher.scan().then(function (metrics) {
    console.log('%i metrics received.', metrics.length)
    return watcher.upload(metrics)
  }).catch(function (error) {
    console.error(error)
  })
}

require('yargs')
  .version(version)
  .option('url', {
    alias: 'u',
    description: 'URL for the CouchDB cluster to scan.',
    default: process.env.COUCH_URL || 'http://localhost:5984'
  })
  .command({
    command: '$0',
    aliases: ['start'],
    description: 'Periodically scan a CouchDB instance and upload the results to AWS CloudWatch.',
    builder: function (yargs) {
      yargs.option('interval', {
        alias: 'i',
        description: 'Interval between scanning for metrics in milliseconds.',
        default: 60000 // one minute
      })
    },
    handler: function ({ url, interval }) {
      const watcher = new AWSCouchWatch({ url })
      watcher.setup().then(() => {
        setInterval(function () {
          return scanWith(watcher)
        }, interval)
      })
    }
  })
  .command({
    command: 'scan',
    description: 'Scan a CouchDB instance once and upload the results to AWS CloudWatch.',
    handler: function ({ url }) {
      const watcher = new AWSCouchWatch({ url })
      watcher.setup().then(() => {
        scanWith(watcher)
      })
    }
  })
  .alias('help', 'h')
  .parse()
