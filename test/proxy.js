function FindProxyForURL (url, host) {
  if (
    host.indexOf('10.68.141.33') > -1 || 
    url.indexOf('https://') > -1 || 
    url.indexOf('ws://') > -1 ||
    url.indexOf('wss://') > -1 
  ) { return "DIRECT;"; }
  return "PROXY 10.68.141.33:9000; DIRECT;";
}