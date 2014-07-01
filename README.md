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
doji.proxy(req, res);
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
  // The local source file director
  dojiDir: "/User/Ryota/Works/demo/src/",
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
  urls: {
    // local files remote
    '^\\/t1\\/(\.*)': function (path, matched) {
      return '/remote1/'+ matched;
    },
    // local file remote2
    '^\\/t2\\/\.*': '/remote2'
  },
  // if set `DOJI_TIME_STAMP_HANDLE` will add timestamp for resource
  // if set an Object like  this will replace the regexp key with the value you give.
  // if set Object value as `TIME_STAMP_BUILDER` or others in doji.Parsers.TOKENS ;
  // @example 
  //  {
  //    '\\<iframe.+?\>': ''  
  //  }
  parsers: [
    parserHandle1,
    parserHandle2,
    doji.noBom,
    {
      '\\a\\.\\b': 'demo.com'
    },
    'DOJI_TIME_STAMP_HANDLE'
  ],
  widgets: {
    "#header": {
      method: 'append',
      file: '/mods/header/header.html',
      // only 'css' 'attr' will use this.
      // future add Juicer compile support
      data: ''
    }
  }
}
```

* proxy
  args: req, res

## Events

  eventType    | when                                                | arguments
  -------------|-----------------------------------------------------|--------------
  req:start    | when request come in                                | args: req
  req:data     | when request data coming                            | args: req
  req:end      | when request data end if u want to handle this data | args: req
  req:abort    | when request error                                  | args: req, res, error
  req:close    | when request closed by server side                  | args: req
  proxy:circle | when proxy in circle                                | args: req, res
  proxy:local  | when connect with local(on PC)                      | args: req, res
  res:start    | when response start                                 | args: req, proxyResponse
  res:data     | when response data coming                           | args: req, proxyResponse
  res:end      | when response data end                              | args: req, proxyResponse

##About me 

I'm a Web-Developer, living in Hangzhou China. 

##How to keep connect with me.

U can post an [email](crazy.jser@gmail.com) or a issue at [github](https://github.com/mo-tools/doji/issues)

Thank you for install doji~


