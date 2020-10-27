---
title: 异步编程
slug: /notes/a-simple-explanation-of-nodejs/async-programming
date: 2020-10-25
description: 《深入浅出 NodeJS》读书笔记
tags:
  - Note
  - A Simple Explanation of NodeJS
---

## Promise 与事件发布订阅

发布订阅模式是低级接口，Promise 是高级接口

[Ryan Dahl: Node JS - JSConf EU 2009](https://youtu.be/EeYvFl7li9E?list=PL37ZVnwpeshGNXb77ObNUbvax-VQ_DWJe&t=1529)
[Ryan Dahl: 我对 Node.js 遗憾的十件事 - JSConf EU 2018](https://youtu.be/M3BM9TB-8yA?t=306)

```js
const { EventEmitter } = require('events')

const isEPromise = promise => promise instanceof EPromise

const PENDING = Symbol('PENDING')
const FULFILLED = Symbol('FULFILLED')
const REJECTED = Symbol('REJECTED')

class EPromise extends EventEmitter {
  constructor(f) {
    super()

    this.state = PENDING
    this.value = undefined
    this.reason = undefined

    const resolve = (value) => {
      if (this.state === PENDING) {
        this.state = FULFILLED
        this.value = value
        setTimeout(() => this.emit('resolve'), 0)
      }
    }
    const reject = (reason) => {
      if (this.state === PENDING) {
        this.state = REJECTED
        this.reason = reason
        setTimeout(() => this.emit('reject'), 0)
      }
    }

    try {
      f(resolve, reject)
    } catch (e) {
      reject(e)
    }
  }

  then(onFulfilled, onRejected) {
    const p = new EPromise((resolve, reject) => {
      if (this.state === PENDING) {
        this.once('resolve', () => resolve(onFulfilled(this.value)))
        this.once('reject', () => reject(onRejected(this.reason)))
      } else if (this.state === FULFILLED) {
        setTimeout(() => resolve(onFulfilled(this.value)), 0)
      } else if (this.state === REJECTED) {
        setTimeout(() => reject(onRejected(this.reason)), 0)
      } else throw new Error('promise state error')
    })
    return p
  }

  catch(f) {
    this.then(v => v, f)
  }

  static resolve(v) {
    if (isEPromise(v)) return v
    return new EPromise(resolve => resolve(v))
  }

  static reject(r) {
    return new EPromise((_, reject) => reject(r))
  }
}
```

其他 Promise 的实现实际上内部也是在 resolve、reject 的时候进行“事件的通知”

Promise 将不可变的部分封装，可变的部分通过 onFulfilled、onRejected 交给开发者

Promise 中的多异步协作：all、race、allSettle……

## 流程控制

- 尾触发与 next：中间件
- async：串行、并行、依赖处理

## 并发控制

```js
for (let i = 0; i < 100; i++) {
  asyncFn()
}
```

如果并发量过大，下层服务可能会吃不消，**可以通过一个队列来控制**
