// // require('http').createServer(function (req, res) {
// //   console.log(req.headers);
// //   console.log(require('url').parse(req.url, true));
// // }).listen(8888)

var doji = require('../lib/doji.js');

var app = doji({
  'rootdir': __dirname,
  'urls': {
    '^.*\.pac$': '/proxy.js',
  }
}).listen(9000, function () {
  console.log('debug proxy in 9000')
});