# aws-couchwatch

Feeds metrics from a [CouchDB](https://couchdb.apache.org/) cluster to [AWS CloudWatch](https://aws.amazon.com/cloudwatch/).

## Install

```bash
git clone git@github.com:neighbourhoodie/aws-couchwatch.git
cd aws-couchwatch
npm i
npm link
```

Now you can run `aws-couchwatch` to begin posting metrics to AWS CloudWatch, provided you have credentials [already specified](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html).

For usage information, run `aws-couchwatch -h`.

**NOTE: Remember to do `aws configure` before using AWS-CouchWatch! Otherwise it will not work.**

## Usage

```
aws-couchwatch

Periodically scan a CouchDB instance and upload the results to AWS CloudWatch.

Commands:
  aws-couchwatch start  Periodically scan a CouchDB instance and upload the
                        results to AWS CloudWatch.                     [default]
  aws-couchwatch scan   Scan a CouchDB instance once and upload the results to
                        AWS CloudWatch.

Options:
  --help, -h      Show help                                            [boolean]
  --version       Show version number                                  [boolean]
  --url, -u       URL for the CouchDB cluster to scan.
                               [default: "http://admin:password@localhost:5984"]
  --interval, -i  Interval between scanning for metrics in milliseconds.
```

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
