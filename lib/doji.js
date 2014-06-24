var mace = require('mace');
var path = require('path');
var url = require('url');
var version = require(path.join(__dirname, '/../package.json')).version;
var debug = require('debug')('doji');
var fs = require('fs');
var http = require('http');
var https = require('https');

function Doji (config) {
  if (!(this instanceof Doji))
    return new Doji(config);
  this.config(config);
  http.globalAgent.maxSockets = 1000;
  this.stack = [];
  this.parsers = [];
}
mace.Klass(Doji, {
  config: function (options) {
    options = this.options = mace.extend(true, {},this.options || Doji.OPTIONS, options);
    var _conf = {};
    mace.each(options, function (item, name) {
      if (name === 'rootdir') {
        _conf.rootdir = item;
      } else {
        name = _conf[name] = [];
        mace.each(item, function (remote, rule) {
          name.push({
            filter: new RegExp(rule),
            remote: remote
          });
        });
      }
    });
    debug('config is ', _conf);
    this.conf = _conf;
    return this;
  },
  parsers: function (parser) {
    this.parsers.push(parser);
  },
  resolve: function (req) {
    var info = url.parse(req.url, true);
    var headers = req.headers;
    var conf = this.conf;
    //
    var isLocal = !info.hostname && !info.port;
    var isCircle = headers['x-proxy-by'] === 'doji';

    var host = info.host = info.host || headers.host;
    conf.hosts.some(function (host) {
      if (host.filter.test(info.host)) {
        return info.host = info.host.replace(host.filter, host.remote);
      }
    });
    info.protocol = info.protocol || 'http:';
    var protocol = info.protocol.split(':').shift();

    info.hostname = info.hostname || host.split(':').shift();
    info.port = info.port || 80;
    info.headers = mace.extend(true, {
      'X-Proxy-by': 'doji',
      'X-Doji-Version': version,
      'X-Forwarded-For': (headers['x-forwarded-for'] || '') +
        (headers['x-forwarded-for'] ? ',' : '') +
        info.hostname,
      'X-Forwarded-Port': (headers['x-forwarded-port'] || '') +
        (headers['x-forwarded-port'] ? ',' : '') +
        info.port,
      'X-Forwarded-Proto': (headers['x-forwarded-proto'] || '') +
        (headers['x-forwarded-proto'] ? ',' : '') +
        protocol
    }, req.headers);

    
    conf.urls.some(function (local) {
      if (local.filter.test(info.pathname)) {
        return req.remote = path.join(conf.rootdir, info.pathname.replace(local.filter, local.remote));
      }
    });
    conf.filters.every(function (path) {
      if (path.filter.test(info.path)) {
        info.path = info.path.replace(path.filter, path.remote);
      }
    });

    var _info = url.parse(info.path, true);;
    info.path = _info.path;
    info.pathname = _info.pathname;
    info.search = _info.search;
    info.query = _info.query;
    info.protocol = protocol;

    req.rootdir = conf.rootdir;
    req.protocol = protocol;
    req.clientIP = (req.connection.remoteAddress||'').split(':').pop();
    req.serverIP = (req.connection.localAddress||'').split(':').pop();
    req.isSecurity = protocol === 'https';
    req.isLocal = isLocal;
    req.isCircle= isCircle;
    req.info = info;
    req.options = {
      'host': info.host,
      'hostname': info.hostname,
      'port': info.port,
      'method': req.method,
      'path': info.path,
      'headers': info.headers,
      "agent": false
    };
  },
  send: function (req, res, pres, buffer) {
    res.statusCode = pres.statusCode;
    mace.each(pres.headers, function (val, name) {
      res.setHeader(name, val);
    });
    res.write(buffer);
    res.end();
  },
  proxy: function (req, res) {
    if (exports.$PACHandle()(req, res)) {return}
    var self = this;
    self.resolve(req);
    self.emit('req:start', req);
    debug('request coming \x1B[32m%s\x1B[39m  \x1B[34mhttp%s://%s%s\x1B[39m', req.method, req.isSecurity ? 's': '', req.info.host, req.info.path);
    if (req.remote && fs.statSync(req.remote).isFile()) {
      debug('local request with remote file %s ', req.remote);
      return fs.createReadStream(req.remote).pipe(res);
    }
    if (req.isCircle) {
      debug('circle request')
      if (self.listeners('proxy:circle')) {
        debug('circle request with proxy:circle handle');
        return self.emit('proxy:circle', req, res);
      }
      debug('circle request with no handle');
      return Doji.$error(req, res, 'circle');
    }
    if (req.isLocal) {
      debug('local request')
      if (self.listeners('proxy:local')) {
        debug('circle request with proxy:local handle');
        return self.emit('proxy:local', req, res);
      }
      debug('local request with no handle');
      return Doji.$error(req, res, 'local');
    }
    var preq = (req.isSecurity ? https : http).request(req.options, function (pres) {
      debug('response coming');
      self.emit('res:start', pres);
      var buff = [];
      pres.on('data', function (data) {
        debug('response data coming');
        self.emit('res:data');
        buff.push(data);
      });
      pres.on('end', function () {
        debug('response data finished');
        pres.body = buff;
        self.emit('res:end');
        var contentType = pres.headers['content-type'] || 'application/octet-stream;';
        // 非HTML跳过，直接返回
        if (contentType.indexOf('html') === -1) {
          pres = Doji.joinbuffer(pres);
          pres = Doji.nobom(pres);
          return self.send(req, res, pres, pres.body);
        }
        debug('Get html file. Use bodyParse!');
        mace.each([
          // 合并处理
          Doji.joinbuffer,
          // 去BOM
          Doji.nobom,
          // 解压缩
          Doji.zlib,
          // 转换编码
          Doji.charset,
          // 更新时间戳
          Doji.timestamp
        ].concat(self.parsers), function (parse) {
          var ret = parse(pres);
          if (ret) {
            pres = ret;
            ret = null;
          }
        });
        self.send(req, res, pres, pres.body);
      });
    });
    preq.on('error', function (e) {
      debug('request error', e);
      if (e.message.match(/ENOTFOUND/)) {
        mace.error('=> Hostname \x1B[31m%s\x1B[39m Not found.', e.hostname);
      }
      if (e.message.match(/EINVAL/)) {
        mace.error('=> ', e);
      }
    });
    preq.on('close', function (e) {
      debug('closed by server ', e);
    });
    // 可以修改发送过来的form数据
    req.on('data', function (data) {
      debug('request data coming');
      self.emit('req:data', data);
      preq.write(data);
    });
    req.on('end', function () {
      debug('request data finished');
      self.emit('req:end');
      preq.end();
    });
    req.on('error', function (e) {
      debug('Abort request with error. %s %s', e.message, e.stack);
      self.emit('req:abort', req, e);
      preq.abort();
    })
  },
  listen: function () {
    var server = this.server = require('http').createServer(this.proxy.bind(this));
    server.listen.apply(server, arguments);
    return this;
  }
}, require('events').EventEmitter);
Doji.OPTIONS = {
  rootdir: process.cwd(),
  // 第一匹配 request path 2 file path
  urls: {
    // '^\/proxy\.pac$': '/proxy.js',
  },
  // replace hosts to hosts
  hosts: {
    // '^(.*\\.)*clam\\.com(\\:\\d+)*$': '127.0.0.1',
    // '^www\.baidu\.com$': 'mp3.baidu.com'
  },
  // path filters
  filters: {
    // '\\/\\d+\\.\\d+\\.\\d+\\/': '/',
    // '(?:\\.|-)min*\\.(js|css)$': '.$1',
    // '(?:\\.|-)(less|sass)*\\.css$': '.$1'
  }
};

Doji.nobom = require('./middleware/nobom.js');
Doji.joinbuffer = require('./middleware/joinbuffer.js');
Doji.zlib = require('./middleware/zlib.js');
Doji.charset = require('./middleware/charset.js');
Doji.timestamp = require('./middleware/timestamp.js');
Doji.$PACHandle = require('./pachandle.js');
Doji.$error = require('./error.js');

exports = module.exports = Doji;
