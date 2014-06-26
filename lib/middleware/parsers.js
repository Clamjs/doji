var url = require('url');
var path = require('path');
var debug = require('debug')('doji:timestamp');
var mace = require('mace');

function Parsers (config) {
  if (!(this instanceof Parsers))
    return new Parsers(config);
  return this.config(config);
}
mace.Klass(Parsers, {
  config: function (options) {
    this.options = [];
    mace.each(options, function (option) {
      debug('option %s match rules', arguments);
      if (option) {
        if (option === 'DOJI_TIME_STAMP_HANDLE') {
          return this.options.push(addSourceTimeStamp);
        }
        if (mace.isFunction(option)) {
          return this.options.push(option);
        }
        if (mace.isObject(option)) {
          mace.each(option, function (repstr, regstr) {
            try {
              var reg = new RegExp(regstr);
              var rep = exports.TOKENS[repstr] || repstr;
              this.options.push(function (buffer, proxyRes, req) {
                return buffer.replace(reg, rep);
              });
            } catch(e) {
              debug('RegExp %s parse failed.', regstr);
              mace.error(e);
            }
          }, this);
        }
      }
    }, this);
  },
  replace: function (buffer, proxyRes, req) {
    buffer = buffer.toString('utf-8');
    mace.each(this.options, function (option) {
      buffer = option(buffer, proxyRes, req) || buffer;
    });
    return new Buffer(buffer)
  }
});
exports = module.exports = Parsers;
exports.PREFIX = 'Doji_Proxy_Id_';
exports.TOKENS = {
  'TIME_STAMP_BUILDER': function () {
    return exports.PREFIX + (+new Date)
  }
};

function addSourceTimeStamp (buffer, proxyRes, req) {
  var reLink = /(?:\<link.+?href\=(\"|\'|)([^\s\r\n\t]+?)(\1).+?\/*\>?)/img;
  var reScript = /(?:\<script.+?src\=(\"|\'|)([^\s\r\n\t]+?)(\1).+?\/*\>?)/img;
  // var reImg = /(?:\<img.+?src\=(\"|\'|)([^\s\r\n\t]+?)(\1).+?\/*\>?)/img;
  return buffer.replace(reLink, function (link, s, href) {
    var _href = exports.resolvePath(href);
    // debug('link %s href %s resolved \x1B[31m%s\x1B[39m ', link.replace(href,_href), href, _href);
    return link.replace(href, _href);
  }).replace(reScript, function (script, s, src) {
    var _src = exports.resolvePath(src);
    // debug('script %s src %s resolved \x1B[31m%s\x1B[39m', script.replace(src, _src), src, _src);
    return script.replace(src, _src);
  });
  // .replace(reImg, function (img, s, src) {
  //   var _src = exports.resolvePath(src);
  //   // debug('img %s src %s resolved \x1B[31m%s\x1B[39m', img.replace(src,_src), src, _src);
  //   return img.replace(src, _src);
  // });
}
exports.resolvePath = function resolvePath (href) {
  var _href = url.parse(href, true);
  var id = exports.PREFIX + (+new Date);
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
}