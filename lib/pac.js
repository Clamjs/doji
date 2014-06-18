var mace = require('mace');
var _pacTpl = fs.readFileSync(path.join(__dirname, '/pac.tpl.js'));

exports = module.exports = function (config) {
  return function (req, res, next) {
    
  };
};
var IPList = [];
mace.each(require('os').networkInterfaces(), function (networkInterface) {
  mace.each(networkInterface, function (item) {
    IPList.push(item.address);
  });
});
exports.IPList = IPList;