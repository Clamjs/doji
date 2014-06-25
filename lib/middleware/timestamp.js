var url = require('url');
var path = require('path');
var debug = require('debug')('doji:timestamp');
var ID_PREFIX = 'Doji_Proxy_Id_';
exports = module.exports = function (buffer, proxyRes) {
  var body = buffer.toString('utf-8');
  var reLink = /(?:\<link.+?href\=(\"|\'|)([^\s\r\n\t]+?)(\1).+?\/*\>?)/img;
  var reScript = /(?:\<script.+?src\=(\"|\'|)([^\s\r\n\t]+?)(\1).+?\/*\>?)/img;
  var reImg = /(?:\<img.+?src\=(\"|\'|)([^\s\r\n\t]+?)(\1).+?\/*\>?)/img;
  buffer = new Buffer(body.replace(reLink, function (link, s, href) {
    var _href = exports.timestamp(href);
    // debug('link %s href %s resolved \x1B[31m%s\x1B[39m ', link.replace(href,_href), href, _href);
    return link.replace(href, _href);
  }).replace(reScript, function (script, s, src) {
    var _src = exports.timestamp(src);
    // debug('script %s src %s resolved \x1B[31m%s\x1B[39m', script.replace(src, _src), src, _src);
    return script.replace(src, _src);
  }).replace(reImg, function (img, s, src) {
    var _src = exports.timestamp(src);
    // debug('img %s src %s resolved \x1B[31m%s\x1B[39m', img.replace(src,_src), src, _src);
    return img.replace(src, _src);
  }));
  return buffer;
};
exports.timestamp = function (href) {
  var _href = url.parse(href, true);
  var id = ID_PREFIX + (+new Date);
  if (!_href.search) {
    return href + '?' + id;
  }
  // debug('Has a search %s', _href.search);
  // href.search = '?a=js&b=js&abc';
  // href.search = '??a.js,b.js?abc';
  if (_href.search[1] === '?') {
    var _search = _href.search.substr(2).split('?');
    if (_search[1]) {
      _search[1] += '&'+ id;
    } else {
      _search[1] = '?' + id;
    }
    _search = '??' + _search.join('?');
    return href.replace(_href.search, _search);
  } else {
    // 可能是YUI Combo格式 暂时不处理
    return href + '&' + id;
  }
};