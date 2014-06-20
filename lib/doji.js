var mace = require('mace');
var path = require('path');
var url = require('url');
var version = require(path.join(__dirname, '/../package.json')).version;
var debug = require('debug')('doji');
var fs = require('fs');
var http = require('http');
var https = require('https');

var gzip = require('gzip-js');
var deflate = require('deflate-js');
var isUtf8 = require('is-utf8');
var iconv = require('iconv-lite');
var _ERROR_PAGE_TPL = fs.readFileSync(__dirname + '/resource/error.html');

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
    debug('config is ', _conf);
    this.conf = _conf;
    return this;
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
    debug('resolved info ', info);
    req.options = {
      'host': info.host,
      'hostname': info.hostname,
      'port': info.port,
      'method': req.method,
      'path': info.path,
      'headers': info.headers
    };
    debug('resolved options', req.options);
  },
  joinBuffer: function (bufferStore) {
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
    debug('send directly');
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
    if (exports.PACHandle()(req, res)) {return}
    var self = this;
    self.resolve(req);
    self.emit('req:start', req);
    debug('request coming \x1B[31m%s\x1B[39m  \x1B[34mhttp%s://%s%s\x1B[39m', req.method, req.isSecurity ? 's': '', req.info.host, req.info.path);
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
      return self.error(req, res, 'circle');
    }
    if (req.isLocal) {
      debug('local request')
      if (self.listeners('proxy:local')) {
        debug('circle request with proxy:local handle');
        return self.emit('proxy:local', req, res);
      }
      debug('local request with no handle');
      return self.error(req, res, 'local');
    }
    var preq = (req.isSecurity ? https : http).request(req.options, function (pres) {
      debug('response coming ');
      self.emit('res:start', pres);
      var buff = [];
      pres.on('data', function (data) {
        debug('response data coming');
        if (self.listeners('res:data').length) {
          debug('resolve response data with res:data handle');
          self.emit('res:data');
        }
        buff.push(data);
      });
      pres.on('end', function () {
        debug('response data finished');
        buff = self.joinBuffer(buff);
        buff = self.rmBom(buff);
        self.emit('res:end', pres, buff);
        if (self.listeners('res:send').length) {
          debug('resolve response.send with res:send');
          var encoding = pres.headers['content-encoding'] || '';
          if (self.isGzip(buff)) {
            buff = gzip.unzip(buff);
            var buffer = new Buffer(buff.length);
            var offset = 0;
            mace.each(buff, function (v, i) {
              buffer[i]=v;
            });
            buff = buffer;
            buffer = null;
            debug('resolve data with gzip.unzip ');
          } else if (encoding.indexOf('deflate') > -1) {
            buff = deflate.inflate(buff);
            debug('resolve data with deflate.inflate');
          }
          buff = self.toUTF8(buff);
          // 清理压缩，长度
          pres.headers['content-encoding'] = null;
          pres.headers['content-length'] = null;
          delete pres.headers['content-encoding'];
          delete pres.headers['content-length'];
          return self.emit('res:send', req, res, pres, buff);
        }
        debug('resolve response.send with doji.send');
        self.send(req, res, pres, buff);
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
    // 可以修改发送过来的form数据
    req.on('data', function (data) {
      debug('request data coming');
      if (self.listeners('req:data').length) {
        debug('resolve request data with req:data');
        return self.emit('req:data', preq, data);
      }
      debug('resolve request data with proxyRequest.write');
      preq.write(data);
    });
    req.on('end', function () {
      debug('request data finished');
      if (self.listeners('req:end').length) {
        debug('resolve request with req:end');
        return self.emit('req:end', preq);
      }
      debug('resolve request with proxyRequest.end');
      preq.end();
    });
    req.on('error', function (e) {
      debug('Abort request with error. %s %s', e.message, e.stack);
      self.emit('req:abort', req, e);
      preq.abort();
    })
  },
  error: function (req, res, msg) {
    res.writeHeader(500, {
      'Content-Type': 'text/html; charset=utf-8'
    });
    res.write(_ERROR_PAGE_TPL.replace('${message}', msg));
    res.end();
  },
  setTimeout: function (server, second) {
    // 默认十秒
    second = second | 0 || 10;
    server.on('connection', function (socket) {
      socket.setTimeout(second * 1000);
    });
  },
  listen: function () {
    var server = this.server = require('http').createServer(this.proxy.bind(this));
    server.listen.apply(server, arguments);
    this.setTimeout(server);
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

Doji.PACHandle = function PACHandle (iplist, pathlist) {
  var iplist = iplist || [];
  var pathlist = pathlist || [];
  var IP_LIST = '';
  mace.each(iplist.concat(exports.IPList), function (ip) {
    IP_LIST+=',"'+ ip + '"';
  });
  IP_LIST = '[' + IP_LIST.substr(1) + ']';
  var PATH_LIST = '';
  mace.each(pathlist.concat([
    /^https/i,
    /^ws/i,
    /^wss/i
  ]), function (regexp) {
    if (typeof regexp === 'string') {
      PATH_LIST += ',' + String(new RegExp(regexp,'i'));
    } else {
      PATH_LIST += ',' +String(regexp);
    }
  });
  PATH_LIST = '['+PATH_LIST.substr(1)+']';
  var PAC_TPL = fs.readFileSync(path.join(__dirname, '/resource/proxy.pac.js'));

  return function (req, res, next) {
    if (url.parse(req.url,true).pathname.match(/.*\.pac$/i)) {
      var local = (req.connection.localAddress || '').split(':').pop() || exports.IPList.local[0];
      var pacfile = [
        'var iplist = ' + IP_LIST + ';',
        'var pathlist = ' + PATH_LIST + ';'
      ];
      pacfile.push('var local="' + local + '";');
      pacfile.push(PAC_TPL);
      pacfile = pacfile.join('\n\r');
      res.writeHeader(200, {
        'Content-Type': 'application/octet-stream'
      });
      debug('PAC file \n\r ', pacfile);
      res.end(pacfile);
      return true;
    }
    next && next();
    return false;
  };
};

exports = module.exports = Doji;

var IPList = [];
IPList.localhost = {
  '::1': 1,
  'localhost': 1,
  '127.0.0.1': 1,
  '255.255.255.255':1,
  'fe80::1%lo0': 1
};
IPList.local = [];
mace.each(require('os').networkInterfaces(), function (networkInterface) {
  mace.each(networkInterface, function (item) {
    if (!IPList.localhost[item.address]) {
      IPList.local.push(item.address);
    }
    IPList.push(item.address);
  });
});
exports.IPList = IPList;