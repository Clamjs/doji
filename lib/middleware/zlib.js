var gzip = require('gzip-js');
var deflate = require('deflate-js');
var debug = require('debug')('doji:zlib');
exports = module.exports = function (proxyRes) {
  var buffer = proxyRes.body;
  var type = proxyRes.headers['content-type'] || '';
  var encoding = proxyRes.headers['content-encoding'] || '';
  if (exports.isGzip(buffer)) {
    buffer = exports.ungzip(buffer);
    debug('resolve data with gzip.unzip ');
  } else if (encoding.indexOf('deflate') > -1) {
    buffer = exports.inflate(buffer);
    debug('resolve data with deflate.inflate');
  }
  proxyRes.body = buffer;
  // 清理压缩，长度
  proxyRes.headers['content-encoding'] = null;
  proxyRes.headers['content-length'] = null;
  delete proxyRes.headers['content-encoding'];
  delete proxyRes.headers['content-length'];
  return proxyRes;
};
exports.ungzip = function () {
  return new Buffer(gzip.unzip.apply(gzip, arguments));
};
exports.gzip = function () {
  return new Buffer(gzip.gzip.apply(gzip, arguments));
};
exports.deflate = function () {
  return new Buffer(deflate.deflate.apply(deflate, arguments));
};
exports.inflate = function () {
  return new Buffer(deflate.inflate.apply(deflate, arguments));
};
exports.isGzip = function (buffer) {
  return (
    buffer[0] === 0x1F && 
    buffer[1] === 0x8B && 
    buffer[2] === 0x08
  );
};