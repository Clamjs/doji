var debug = require('debug')('doji:nobom');
exports = module.exports = function (buffer, proxyRes) {
  return exports.noBom(buffer);
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
    debug('Find bom data remove this');
    return buffer.slice(3, buffer.length);
  }
  return buffer;
};
