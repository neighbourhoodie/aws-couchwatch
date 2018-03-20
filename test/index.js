/* global describe, it, before */
'use strict'

const assert = require('assert')
const AWSCouchWatch = require('..')

const url = process.env.COUCH_URL || 'http://localhost:5984'
const interval = 60000

describe('aws-couchwatch', function () {
  before(function () {
    this.watcher = new AWSCouchWatch({
      url,
      interval,
      // region is not properly set by aws-sdk
      // so we have to be explicit
      // https://stackoverflow.com/questions/31039948/configuring-region-in-node-js-aws-sdk
      aws: {
        region: process.env.AWS_REGION || 'us-east-2'
      }
    })
    return this.watcher.setup()
  })

  it('should upload metrics to AWS CloudWatch', function () {
    this.timeout(10000)
    return this.watcher.scan().then((report) => {
      return this.watcher.upload(report)
    }).then((data) => {
      assert(data.ResponseMetadata || data.length)
    })
  })
})
