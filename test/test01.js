// // require('http').createServer(function (req, res) {
// //   console.log(req.headers);
// //   console.log(require('url').parse(req.url, true));
// // }).listen(8888)

var doji = require('../lib/doji.js');

var app = doji({
  'rootdir': __dirname,
  'urls': {
    '^.*\.pac$': '/proxy.js',
  },
  'widgets': {
    'rootdir': __dirname,
    'widgets': {
      '#menu-primary': {
        "file": "./test.html",
        "context": {
          "time": +new Date,
          "message": "abc"
        }
      }
    }
  }
}).listen(9000, function () {});