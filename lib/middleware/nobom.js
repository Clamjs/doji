var debug = require('debug')('doji:nobom');
exports = module.exports = function (proxyRes) {
  proxyRes.body = exports.noBom(proxyRes.body);
  return proxyRes;
};
exports.hasBom = function (buffer) {
  return (
    buffer[0] === 0xEF && 
    buffer[1] === 0xBB && 
    buffer[2] === 0xBF
  );
};
exports.noBom = function (buffer) {
  if (exports.hasBom(buffer)) {
    return buffer.slice(3, buffer.length);
  }
  return buffer;
};
