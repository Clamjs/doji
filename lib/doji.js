var mace = require('mace');
var path = require('path');
var version = require(path.join(__dirname, '/../package.json')).version;
var debug = require('debug')('doji');
var fs = require('fs');
var _pacTpl = fs.readFileSync(path.join(__dirname, '/pac.tpl.js'));

var gzip = require('gzip-js');
var deflate = require('deflate-js');
var isUtf8 = require('is-utf8');
var iconv = require('iconv-lite');

function Doji (config) {
  if (!(this instanceof Doji))
    return new Doji(config);
  this.config(config);
  this.stack = [];
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
    this.conf = _conf;
  },
  resolve: function (req) {
    var info = url.parse(req.url, true);
    var headers = req.headers;
    //
    var isLocal = !info.hostname && !info.port;
    var isCircle = headers['x-proxy-by'] === 'doji';

    var host = info.host = info.host || headers.host;
    conf.hosts.some(function (host) {
      if (host.filter.test(info.host)) {
        return info.host = info.host.replace(host.filter, host.remote);
      }
    });
    var protocol = info.protocol.split(':').shift();
    var conf = this.conf;

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
      if (local.filter.test(pathname)) {
        return req.remote = path.join(conf.rootdir, pathname.replace(local.filter, local.remote));
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

    req.rootdir = conf.rootdir;
    req.protocol = protocol;
    req.clientIP = req.connection.remoteAddress;
    req.serverIP = req.connection.localAddress;
    req.isSecurity = protocol === 'https';
    req.isLocal = isLocal;
    req.isCircle= isCircle;
    req.info = info;
    req.options = {
      'host': info.host,
      'hostname': info.hostname,
      'port': info.port,
      'localAddress': req.serverIP,
      'method': req.method,
      'path': info.path,
      'headers': info.headers,
      'agent': false,
      'auth': ''
    };
  },
  joinBuffer: function (buffStore) {
    var length = buffStore.reduce(function(previous, current) {
        return previous + current.length;
    }, 0);

    var buffer = new Buffer(length);
    var startPos = 0;
    buffStore.forEach(function(buffer){
        buffer.copy(buffer, startPos);
        startPos += buffer.length;
    });
    return buffer;
  },
  hasBom: function (buffer) {
    return (
      buffer[0] === 0xEF && 
      buffer[1] === 0xBB && 
      buffer[2] === 0xBF
    );
  },
  rmBom: function (buffer) {
    if(this.hasBom(buffer)) {
      buffer = buffer.slice(3, buffer.length);
    }
    return buffer;
  },
  isGzip: function (buffer) {
    return (
      buffer[0] === 0x1F && 
      buffer[1] === 0x8B && 
      buffer[2] === 0x08
    );
  },
  toUTF8: function (buffer) {
    if (!isUtf8(buffer)) {
      return iconv.decode(buffer, 'gbk');
    }
    return buffer;
  },
  toGBK: function (buffer) {
    return iconv.encode(buffer, 'gbk');
  },
  send: function (req, res, pres, buffer) {
    res.statusCode = pres.statusCode;
    mace.each(pres.headers, function (val, name) {
      res.setHeader(name, val);
    });
    res.write(buffer);
    res.end();
  },
  gzip: gzip,
  deflate: deflate,
  proxy: function (req, res) {
    var self = this;
    self.resolve(req);
    self.emit('request', req);
    if (req.isCircle) {
      if (self.listeners('circle')) {
        return self.emit('circle', req, res);
      }
      return self.error(req, res, 'circle');
    }
    if (req.isLocal) {
      if (self.listeners('local')) {
        return self.emit('local', req, res);
      }
      return self.error(req, res, 'local');
    }
    if (req.remote && fs.statSync(req.remote).isFile()) {
      return fs.readFileSync(req.remote).pipe(res);
    }
    var preq = (req.isSecurity ? https : http).request(req.options, function (pres) {
      var buff = [];
      pres.on('data', function (data) {
        buff.push(data);
      });
      pres.on('end', function () {
        buff = self.joinBuffer(buff);
        if (self.listeners('response').length) {
          var encoding = pres.headers['content-encoding'] || '';
          buff = self.rmBom(buff);
          if (self.isGzip(buff)) {
            buff = gzip.unzip(buff);
          } else if (encoding.indexOf('deflate') > -1) {
            buff = deflate.inflate(buff);
          }
          buff = self.toUTF8(buff);
          return self.emit('response', req, res, pres, buff);
        }
        self.send(req, res, pres, buff);
      });
    });
    preq.on('error', function (e) {
      if (e.message.match(/ENOTFOUND/)) {
        mace.error('=> Hostname \x1B[31m%s\x1B[39m Not found.', e.hostname);
      }
    });
    // 可以修改发送过来的form数据
    req.on('data', function (data) {
      if (self.listeners('req:data').length) {
        return self.emit('req:data', preq, data);
      }
      preq.write(data);
    });
    req.on('end', function () {
      if (self.listeners('req:end').length) {
        return self.emit('req:end', preq);
      }
      preq.end();
    });
    req.on('error', function (e) {
      debug('Abort request with error. %s %s', e.message, e.stack);
      self.emit('abort', req);
      preq.abort();
    })
  },
  error: function (req, res, msg) {
    res.writeHeader(500, {
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.write(fs.readFileSync(__dirname + '/error.html').replace('${message}', msg));
    res.end();
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
Doji.PACHandle = require(__dirname + '/pac.js');