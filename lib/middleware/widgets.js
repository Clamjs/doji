
var cheerio = require('cheerio');
var debug = require('debug')('doji:widget');
var mace = require('mace');
var fs = require('fs');
var path = require('path');

function Widgets (config) {
  if (!(this instanceof Widgets))
    return new Widgets(config);
  this.config(config);
  return this;
}
mace.Klass(Widgets, {
  config: function (config) {
    this.conf = mace.extend(true, {}, this.conf || Widgets.CONFIG, config);
    this.widgets = Object.keys(this.conf.widgets);
  },
  replace: function (proxyRes) {
    // no widgets do nothing
    if (!this.widgets.length) {return proxyRes}
    var buffer = proxyRes.body;
    var rootdir = this.conf.rootdir;
    var widgets = this.conf.widgets;
    var $ = cheerio.load(buffer.toString('utf-8'));
    mace.each(widgets, function (widget, selector) {
      var file = path.join(rootdir, widget.file);
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        debug('Find File \x1B[31m%s\x1B[39m, %s', file, $(selector));
        $(selector).replaceWith(
          fs.readFileSync(file).toString('utf-8')
        );
      }
    });
    proxyRes.body = $.html();
    return proxyRes;
  }
}, require('events').EventEmitter);
mace.extend(Widgets, {
  CONFIG: {
    rootdir: '',
    widgets: {
      // selector : {
      //  file: '',
      //  context: ''
      // }
    }
  } 
});
exports = module.exports = Widgets;