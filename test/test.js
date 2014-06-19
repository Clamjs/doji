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

app.on('req:start', function (req) {
  console.log('isCircle %s, isLocal %s, isSecurity %s, remote %s',req.isCircle, req.isLocal, req.isSecurity, req.remote);
  console.log('method %s %s://%s%s',req.method, req.protocol, req.info.host, req.info.path);

  console.log(req.options)
});
app.on('res:start', function () {
  console.log('response start');
});
app.on('res:data', function () {
  console.log('response data coming')
});
app.on('res:end', function (res, buffer) {
  console.log('response data end',buffer);
});
// app.on('res:send', function (req, res, nsres, buffer) {

// });