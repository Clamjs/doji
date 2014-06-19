function FindProxyForURL (url, host) {
  var host = host.split(":")[0].toLowerCase();
  var protocol = url.split("://").shift().toLowerCase();
  for (var i = 0;i < iplist.length; i++) {
    var ip = iplist[i];
    if (host === ip || (ip.test && ip.test(host))) {
      return "DIRECT";
    }
  }
  for (var i = 0; i < pathlist.length; i++) {
    var path = pathlist[i];
    if (url === path || (path.test && path.test(host))) {
      return "DIRECT";
    }
  }
  return "PROXY " + local + ":9000; DIRECT;";
}