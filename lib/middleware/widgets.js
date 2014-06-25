
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
  replace: function (buffer, proxyRes) {
    // no widgets do nothing
    if (!this.widgets.length) {return buffer}
    var rootdir = this.conf.rootdir;
    var widgets = this.conf.widgets;
    var $ = cheerio.load(buffer.toString('utf-8'));
    mace.each(widgets, function (widget, selector) {
      var file = path.join(rootdir, widget.file);
      var method = widget.method;
      var support = exports.SUPPORT_METHODS[method];
      var needFile = support === exports.SUPPORT_TYPES.FILE;
      // 不支持该方法 
      // 方法需要文件，但是 文件不存在 不是文件
      if (
        !support ||
        (
          needFile && 
          (
            !fs.existsSync(file) || 
            !fs.statSync(file).isFile()
          )
        )
      ) {
        debug('Get method %s and support is %s. File path is %s ', method, support, file);
        return;
      }
      var $target = $(selector);
      if (needFile) {
        $target[method](
          fs.readFileSync(file).toString('utf-8')
        );
      } else {
        $target[method](widget.data || '');
      }
    });
    return $.html();
  }
}, require('events').EventEmitter);
mace.extend(Widgets, {
  CONFIG: {
    rootdir: '',
    widgets: {
      // selector : {
      //  file: '',
      //  method: "append",
      //  data: ''
      // }
    }
  } 
});
exports = module.exports = Widgets;
exports.SUPPORT_TYPES = {
  'FILE': 1,
  'STRING': 2,
  'ATTR': 3
};
exports.SUPPORT_METHODS = {
  'before': 1,
  'after': 1,
  'prepend': 1,
  'append': 1,
  'replaceWith': 1,
  'remove': 1,
  'empty': 1,
  'html': 2,
  'text': 2,
  'css': 3,
  'attr': 3
};