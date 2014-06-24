var fs = require('fs');
var path = require('path');
var url = require('url');
var _ERROR_PAGE_TPL = fs.readFileSync(__dirname + '/resource/error.html');
exports = module.exports = function (req, res, message) {
  res.writeHeader(500, {
    'Content-Type': 'text/html; charset=utf-8'
  });
  res.write(_ERROR_PAGE_TPL.replace('${message}', msg));
  res.end();
};