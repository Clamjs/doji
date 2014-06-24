var debug = require('debug')('doji:joinbuffer');

exports = module.exports = function (proxyRes) {
  proxyRes.body = exports.joinBuffer(proxyRes.body);
  return proxyRes;
};
exports.joinBuffer = function (bufferStore) {
  var length = bufferStore.reduce(function(previous, current) {
    return previous + current.length;
  }, 0);
  var buffer = new Buffer(length);
  var startPos = 0;
  bufferStore.forEach(function(piece){
    piece.copy(buffer, startPos);
    startPos += piece.length;
  });
  return buffer;
};