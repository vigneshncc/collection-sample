#!/usr/bin/env node

var es = require('event-stream');
var mongodb = require('mongodb');
var sample = require('../');
var toNS = require('mongodb-ns');
var EJSON = require('mongodb-extended-json');
var pkg = require('../package.json');

// var debug = require('debug')('mongodb-collection-sample:bin');

var argv = require('yargs')
  .usage('Usage: $0 <uri> <ns> [options]')
  .demand(2)
  .option('n', {
    alias: 'sample',
    default: 100,
    describe: 'The number of documents to sample.'
  })
  .option('o', {
    alias: 'output',
    type: 'boolean',
    describe: 'Print the sampled documents to stdout.',
    default: true
  })
  .describe('debug', 'Enable debug messages.')
  .describe('version', 'Show version.')
  .alias('h', 'help')
  .describe('h', 'Show this screen.')
  .help('h')
  .argv;

if (argv.debug) {
  process.env.DEBUG = '*';
}

var uri = argv._[0];
if (!uri.startsWith('mongodb://')) {
  uri = 'mongodb://' + uri;
}
var sampleSize = parseInt(argv.sample, 10);

if (argv.version) {
  console.error(pkg.version);
  process.exit(1);
}

mongodb.connect(uri, function(err, conn) {
  if (err) {
    console.error('Failed to connect to MongoDB: ', err);
    process.exit(1);
  }

  var ns = toNS(argv._[1]);
  var db = conn.db(ns.database);

  var options = {
    size: sampleSize,
    query: {}
  };

  sample(db, ns.collection, options)
    .pipe(es.map(function(data, cb) {
      if (data && argv.output) {
        console.log(EJSON.stringify(data, null, 2));
      }
      cb(null, data);
    }))
    .pipe(es.wait(function(sampleErr) {
      if (sampleErr) {
        console.error('Error sampling data:', sampleErr);
        process.exit(1);
      }
      process.exit(0);
    }));
});
