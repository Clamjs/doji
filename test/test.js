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
});
// app.on('res:start', function () {
  
// });
// app.on('res:data', function () {
  
// });
// app.on('res:end', function (res, buffer) {
  
// });
app.on('res:send', function (req, res, nsres, buffer) {
  console.log(buffer.toString('utf-8'));
  app.send(req,res,nsres,buffer);
});