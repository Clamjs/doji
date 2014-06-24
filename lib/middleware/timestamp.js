var url = require('url');
var path = require('path');
var debug = require('debug')('doji:timestamp');
exports = module.exports = function (proxyRes) {
  var body = proxyRes.body.toString('utf-8');
  var reLink = /\<link.+?\shref\=(.+?)\s\/*\>/img;
  var reScript = /\<script \>\<\/script\>/img;
  body.replace(reLink, function () {
    debug('css matched',arguments);
  });
  return proxyRes;
};