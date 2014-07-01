Doji使用手册

## 什么是Doji
 
Doji 是一个功能丰富且强大的，专为前端开发调试所写的代理服务。

## 如何安装

Mac用户可以执行

```
sudo npm install -g doji
```

Windows用户

```
npm install -g doji
```

##如何使用

### 一、 服务模式
服务模式，开发者只需要listen一个端口，代理的服务就启动了。
这个时候，可以将目标终端配置代理到该服务。如何接入请看第三节。

```nodejs
var doji = require('doji');
var proxy = doji({
  //your options
});
proxy.listen(9000);
```

### 二、 工具库模式
工具库模式，doji将做为中间件存在。只需要将 `request` `response`对象交给 `doji`。`doji`就可以进行代理转发了。

```nodejs
var doji = require('doji');
var proxy = doji({
  // your options
});
proxy.proxy(req, res);
// 根据请求对象动态生成pac
var pacHandle = doji.PACHandle;
// 去bom
var removeBom = doji.noBom;
// on data后的buffer拼接
var joinbuffer = doji.joinbuffer
// 转换压缩部分。封装自gzip-js deflate-js
var zlib = doji.zlib
// 基本的gbk utf8互转，封装自 is-utf8 iconv-lite
var charsets = doji.charset;
```
### 三、 如何接入代理服务器

在移动设备上

* IOS

打开手机设置，进入到WIFI配置，找到当前连接的WIFI，进入设置。
在最下面有一个配置是http 代理（http proxy） 开发者根据自己的需求，可配置手动（IP+PORT）或者自动（http://ip/any_path.pac）pac模式目录是任意的，如果不想配置端口，只需要在80端口的服务上调用`doji.PACHandle(req, res, next)`即可。

* Android
基本配置参考IOS。只是Android没有PAC的支持，但是有host过滤。

* MAC
在网络中找到高级设置，代理下找到自动代理。配置对应pac文件路径（参考IOS pac代理配置部分）

* Windows
在浏览器中配置代理ip port 和host 过滤即可。

## 接口

### 一、config

更新doji的配置项。

```nodejs
doji.config(config)
```

配置项的详细说明：

```
{
  // 代理根目录。必须配置。 默认使用 process.cwd()
  dojiDir: "/User/Ryota/Works/ju-pad/src/",
  // 过滤条件 把url中的部分替换成指定结果。
  filters: {
    '\\/\\d+\\.\\d+\\.\\d+\\/': '/',
    '(\\-min\\.)(js|css)': '.$2',
    '(\\.min\\.)(js|css)': '.$2'
  },
  // 把匹配到的host名称，替换成指定结果。
  hosts: {
    'c\\.cc\\:9001': 'debug.clam.org:9002',
    '(\.*)\\.tbcdn.cn': function (host, matched) {
      return matched + '.daily.clam.org';
    }
  },
  // 把匹配到的指定路径替换为本地文件 
  urls: {
    // local files remote
    '^\\/t1\\/(\.*)': function (path, matched) {
      return '/remote1/'+ matched;
    },
    // local file remote2
    '^\\/t2\\/\.*': '/remote2'
  },
  // 配置返回数据的操作替换
  parsers: [
    'DOJI_TIME_STAMP_HANDLE',
    {
      '\\a\\.\\b': "clam.com"
    },
    doji.noBom
  ],
  // 把部分html内容替换成为指定的文件。后续增加juicer动态编译功能。
  widgets: {
    "#header": {
      "method": "replaceWith",
      "file": "./mods/header/header.html",
      "data": {}
    }
  }
}
```
### 二、 proxy

proxy方法用来拦截一个请求并且进行代理行为。

当这个请求不是一个代理（本地请求）或者是一个循环代理（host指向了本地）
proxy不会继续拦截。而是交给开发者进行处理。

如果发现是一个正常的请求。proxy方法会经过根据配置适配后的信息进行转发代理。
当代理返回数据后，proxy，将html内容根据配置进行处理。然后返回。

proxy 方法接收两个参数： request, response 

proxy 触发了以下事件供开发者监听处理。


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

### 三、 send
如果经过处理，需要将代理的数据返回。可以使用 `send` 方法
`send`接收四个参数， `request`, `response`, `proxyResponse`, `bufferData` 返回的头信息，状态将根据`proxyResponse`确定。 `bufferData`为返回的实体。


