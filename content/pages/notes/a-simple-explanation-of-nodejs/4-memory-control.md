---
title: 内存控制
slug: /note/a-simple-explanation-of-nodejs/memory-control
date: 2020-10-26
description: 《深入浅出 NodeJS》读书笔记
tags:
  - Note
  - A Simple Explanation of NodeJS
---

[美团面试下面有记过 V8 GC](https://ahabhgk.github.io/blog/interview-of-meituan-internship)

```shell
node --trace_gc -e "var a = []; for (var i = 0; i < 1000000; i++) a.push(new Array(100));"
```

## 内存泄漏

1. 内存当缓存：把对象的键值来当缓存，但缓存有严格的过期策略，键值没有
2. 模块会被缓存：模块编译执行后形成作用域导致变量不被释放
3. 队列消费不及时

## 内存泄漏排查

- node-heapdump
- node-memwatch

## 大内存应用

使用 stream
