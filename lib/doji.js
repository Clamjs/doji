var mace = require('mace');
var path = require('path');
var url = require('url');
var version = require(path.join(__dirname, '/../package.json')).version;
var debug = require('debug')('doji');
var fs = require('fs');
var http = require('http');
var https = require('https');
var $PACHandle = require('./pachandle.js');
var $error = require('./error.js');
function Doji (config) {
  if (!(this instanceof Doji))
    return new Doji(config);
  this.config(config);
  http.globalAgent.maxSockets = 1000;
  this.stack = [];
}
mace.Klass(Doji, {
  config: function (options) {
    options = this.options = mace.extend(true, {},this.options || Doji.OPTIONS, options);
    var _conf = {};
    mace.each(options, function (item, name) {
      if (name === 'widgets') {
       return _conf['widgets'] = item;
      }
      if (name === 'rootdir') {
        return _conf.rootdir = item;
      } 
      name = _conf[name] = [];
      mace.each(item, function (remote, rule) {
        name.push({
          filter: new RegExp(rule),
          remote: remote
        });
      });
    });
    this.conf = _conf;
    console.log()
    this.widgets = Doji.Widgets(_conf.widgets);
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
    req.options = {
      'host': info.host,
      'hostname': info.hostname,
      'port': info.port,
      'method': req.method,
      'path': info.path,
      'headers': info.headers
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
    if ($PACHandle()(req, res)) {return}
    var self = this;
    var conf = self.conf;
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
      return Doji.$error('circle')(req, res);
    }
    if (req.isLocal) {
      debug('local request')
      if (self.listeners('proxy:local')) {
        debug('circle request with proxy:local handle');
        return self.emit('proxy:local', req, res);
      }
      debug('local request with no handle');
      return Doji.$error('local')(req, res);
    }
    var preq = (req.isSecurity ? https : http).request(req.options, function (pres) {
      debug('response coming');
      self.emit('res:start', req, pres);
      var buff = [];
      pres.on('data', function (data) {
        // debug('response data coming');
        self.emit('res:data', req, pres);
        buff.push(data);
      });
      pres.on('end', function () {
        debug('response data finished');
        self.emit('res:end', req, pres);
        var contentType = pres.headers['content-type'] || '';
        debug('Content-Type: %s', contentType);
        // 合并
        buff = Doji.joinbuffer(buff);
        if (contentType.indexOf('html') === -1) {
          debug('Not a html send directly!');
          return self.send(req, res, pres, buff)
        }
        // 去BOM
        buff = Doji.nobom(buff);
        // 解压
        buff = Doji.zlib(buff, pres);
        // 解码
        buff = Doji.charset(buff, pres);
        // 判断是否html页面
        if (buff.toString('utf-8').match(/^\s*\<\!doctype\s/i)) {
          debug('Get html file. Use bodyParse!');
          mace.each([
            // 切部分DOM到指定文件
            self.widgets.replace.bind(self.widgets),
            // 更新时间戳
            Doji.timestamp
          ].concat(conf.parsers), function (parse) {
            if (parse && (parse = parse(buff, pres))) {
              buff = parse;
              parse = null;
            }
          });
        }
        return self.send(req, res, pres, buff);
      });
      pres.on('close', function (e) {
        console.log('closing ',e);
      });
    });
    preq.on('error', function (e) {
      debug('request error', e);
      if (e.message.match(/ENOTFOUND/)) {
        mace.error('=> Hostname \x1B[31m%s\x1B[39m Not found.', e.hostname);
      }
      mace.error('=> ', e);
    });
    preq.on('close', function () {
      debug('closed by server');
      self.emit('req:close', req);
    });
    // 可以修改发送过来的form数据
    req.on('data', function (data) {
      // debug('request data coming');
      self.emit('req:data', req);
      preq.write(data);
    });
    req.on('end', function () {
      debug('request data finished');
      self.emit('req:end', req);
      preq.end();
    });
    req.on('error', function (e) {
      debug('Abort request with error. %s %s', e.message, e.stack);
      self.emit('req:abort', req, res, e);
      preq.abort();
    });
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
  },
  parsers: [

  ],
  widgets: {

  }
};

Doji.PACHandle = $PACHandle;
Doji.nobom = require('./middleware/nobom.js');
Doji.joinbuffer = require('./middleware/joinbuffer.js');
Doji.zlib = require('./middleware/zlib.js');
Doji.charset = require('./middleware/charset.js');
Doji.timestamp = require('./middleware/timestamp.js');
Doji.Widgets = require('./middleware/widgets.js');
exports = module.exports = Doji;
