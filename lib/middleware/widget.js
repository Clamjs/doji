var cheerio = require('cheerio');
var debug = require('debug')('doji:widget');
var mace = require('mace');

function Widget (config) {
  if (!(this instanceof Widget))
    return new Widget(config);
  this.config(config);
  return this;
}
mace.Klass(Widget, {
  config: function (config) {
    config = mace.extend(true, {}, this.conf || Widget.CONFIG, config);
  }
}, require('events').EventEmitter);
mace.extend(Widget, {
  CONFIG: {
    rootdir: '',
    widgets: {
      // selector: file
    }
  } 
});
exports = module.exports = function (proxyRes) {
  var buffer = proxyRes.body;
};
exports.replace = function (source, selector, buffer) {
  
};