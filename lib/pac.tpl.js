var directs = ${directs};
var protocols = ['https','ws'];
function FindProxyForURL (url, host) {
  var host = host.split(":")[0].toLowerCase();
  var protocol = url.split("://").shift().toLowerCase();
  if (
    directs.indexOf(host) > -1 || 
    protocols.indexOf(protocol) > -1
  ) { return "DIRECT;"; }
  return "PROXY " + ${local} + ":9000; DIRECT;";
}