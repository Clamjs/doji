var isUtf8 = require('is-utf8');
var iconv = require('iconv-lite');
var debug = require('debug')('doji:charset');
exports = module.exports = function (buffer, proxyRes) {
  buffer = exports.toUTF8(buffer);
  proxyRes.headers['content-type'] = 'text/html; charset=utf-8';
  return buffer;
};
exports.toUTF8 = function (buffer) {
  if (!isUtf8(buffer)) {
    debug('Get GBK charset, decode to UTF8');
    return iconv.decode(buffer, 'gbk');
  }
  return buffer;
};
exports.toGBK = function (buffer) {
  return iconv.encode(buffer, 'gbk');
};