var fs = require('fs');
var path = require('path');
var url = require('url');
var debug = require('debug')('doji:PacHandle');
var mace = require('mace');
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

function PACHandle (iplist, pathlist) {
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
exports = module.exports = PACHandle;
exports.IPList = IPList;