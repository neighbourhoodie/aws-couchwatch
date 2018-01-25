# aws-couchwatch

Feeds metrics from a [CouchDB](https://couchdb.apache.org/) cluster to [AWS CloudWatch](https://aws.amazon.com/cloudwatch/).

## Install & Usage

```bash
git clone git@github.com:neighbourhoodie/aws-couchwatch.git && cd $_
npm i
npm link
```

Now you can run `aws-couchwatch` to begin posting metrics to AWS CloudWatch, provided you have credentials [already specified](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html).

For usage information, run `aws-couchwatch -h`.

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
