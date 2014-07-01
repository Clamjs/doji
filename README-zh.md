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

```nodejs
var doji = require('doji');
var proxy = doji({
  //your options
});
proxy.listen(9000);
```

### 二、 工具库模式

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

## 事件

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


