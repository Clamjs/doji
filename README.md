# Doji

Doji is a simple but strong http proxy lib.

Also U can use this with [host manager](http://npmjs.org/flail)

## Install

For Mac

```
sudo npm install -g doji
```

For Windows

```
npm install -g doji
```

If U get some error like `"Cannot find module 'doji'"`, see [how to resolve the windows path](http://stackoverflow.com/questions/9587665/nodejs-cannot-find-installed-module-on-windows);


## use like a server 

```
var doji = require('doji');
var proxy = doji({
  //your options
});
proxy.listen(9000);
```

## use like a lib

```
var doji = require('doji');
doji.proxy(req, handle);
doji.request(http||https, options, request, handle)
```

## API

* config

Update the proxy server config

```
doji.config(options)
```

options demo:

```
{
  filters: {
    '\\/\\d+\\.\\d+\\.\\d+\\/': '/',
    '(\\-min\\.)(js|css)': '.$2',
    '(\\.min\\.)(js|css)': '.$2'
  },
  hosts: {
    'c\\.cc\\:9001': 'debug.clam.org:9002',
    '(\.*)\\.tbcdn.cn': function (host, matched) {
      return matched + '.daily.clam.org';
    }
  },
  paths: {
    '^\\/t1\\/(\.*)': function (path, matched) {
      return '/remote1/'+ matched;
    },
    '^\\/t2\\/\.*': '/remote2'
  }
}
```

* proxy
  args: req, handle

## Events

  eventType| when| arguments
  ---------|-----|---------
  request |  when request come in           | args: req
  circle  |  when proxy in circle           | args: req, res
  local   |  when connect with local(on PC) | args: req, res
  response | when proxy response data       | args: req, res, proxyRes, resData


##About me 

I'm a Web-Developer, living in Hangzhou China. 

##How to keep connect with me.

U can post an [email](crazy.jser@gmail.com) or a issue at [github](https://github.com/lichenhao/doji/issues)

Thank you for install doji~


