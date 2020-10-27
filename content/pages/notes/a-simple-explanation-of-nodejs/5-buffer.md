---
title: 理解 Buffer
slug: /notes/a-simple-explanation-of-nodejs/buffer
date: 2020-10-26
description: 《深入浅出 NodeJS》读书笔记
tags:
  - Note
  - A Simple Explanation of NodeJS
---

浏览器上很少遇到处理大量二进制数据的情况，所以 ES 规范中没有这方面的定义；Node 中处理网络协议、处理图片、接收上传文件等需要处理，JS 的字符串不能应付，所以有了 Buffer

Buffer 性能相关的用 C++ 写的 node_buffer 实现，其余部分用 JS

由于 Buffer 太过常见，Node 在进程启动时就用到，所以放在了 global 对象上，无需 require

## Buffer 对象

使用 `Buffer.alloc`、`Buffer.from`、`Buffer.allocUnsafe` 代替 `new Buffer`

```js
function stringToBase64(req, res) {
  // The request body should have the format of `{ string: 'foobar' }`.
  const rawBytes = new Buffer(req.body.string);
  const encoded = rawBytes.toString('base64');
  res.end({ encoded });
}
```

`new Buffer(42)` 创建一个 42 个字节的 缓存，`new Buffer('abc')` 创建一个 UTF-8 编码的字符串 'abc'，上面代码攻击者可以故意传入一个数字，开一个很大的内存以进行攻击，[请使用 Buffer.from() / Buffer.alloc()](https://nodejs.org/zh-cn/docs/guides/buffer-constructor-deprecation/)

## Buffer 内存分配
