---
title: JavaScript
slug: /notes/accumulator/javascript
date: 2020-05-14
author: ahabhgk
description: JavaScript
tags:
  - Note
---

参考[工业聚：100 行代码实现 Promises/A+ 规范](https://zhuanlan.zhihu.com/p/83965949)

```js
const isFunction = obj => typeof obj === 'function'
const isObject = obj => !!(obj && typeof obj === 'object') // null 的情况
const isThenable = obj => (isFunction(obj) || isObject(obj)) && 'then' in obj && isFunction(obj.then)
const isPromise = promise => promise instanceof Promise

const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class Promise {
  constructor(fn) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []
    function resolve(value) {
      if (this.status !== PENDING)
        return
      setTimeout(() => {
        this.status = FULFILLED
        this.value = value
        this.onFulfilledCallbacks.forEach(cb => cb(this.value))
      }, 0)
    }
    function reject(reason) {
      if (this.status !== PENDING)
        return
      setTimeout(() => {
        this.status = REJECTED
        this.reason = reason
        this.onRejectedCallbacks.forEach(cb => cb(this.reason))
      })
    }
    try {
      fn(resolve, reject)
    } catch (e) {
      reject(e)
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
    return bridgePromise = new Promise((resolve, reject) => {
      if (this.status === FULFILLED) {
        setTimeout(() => {
          try {
            let result = onFulfilled(this.value)
            resolvePromise(bridgePromise, result, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      } else if (this.status === REJECTED) {
        setTimeout(() => {
          try {
            let result = onRejected(this.reason)
            resolvePromise(bridgePromise, result, resolve, reject)
          } catch (e) {
            reject(e)
          }
        }, 0)
      } else if (this.status === PENDING) {
        this.onFulfilledCallbacks.push(() => {
          try {
            let result = onFulfilled(this.value)
            resolvePromise(bridgePromise, result, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
        this.onRejectedCallbacks.push(() => {
          try {
            let result = onRejected(this.reason)
            resolvePromise(bridgePromise, result, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }
    })
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  static resolve(p) {
    if (isPromise(p)) return p
    return new Promise((resolve, reject) => {
      if (isThenable(p)) p.then(resolve, reject)
      else resolve(p)
    })
  }

  static reject(p) {
    return new Promise((_, reject) => reject(p))
  }

  static all(promises) {
    return new Promise((resolve, reject) => {
      let values = []
      let count = 0
      function handle(value, index) {
        values[index] = value
        if (++count === promises.length) resolve(values)
      }
      // p 可能不是 Promise，所以用 Promise.resolve 包一下
      promises.forEach((p, i) => Promise.resolve(p).then(value => handle(value, i), reject))
    })
  }

  static race(promises) {
    return new Promise((resolve, reject) => {
      promises.forEach(p => Promise.resolve(p).then(resolve, reject))
    })
  }

  static allSettled(promises) {
    return new Promise((resolve) => {
      let results = []
      let count = 0
      function handle(result, index) {
        results[index] = result
        if (++count === promises.length) resolve(results)
      }
      promises.forEach((p, i) => Promise.resolve(p).then(
        value => handle({ status: 'fulfilled', value }, i),
        reason => handle({ status: 'rejected', reason }, i),
      ))
    })
  }
}

function resolvePromise(bridgePromise, result, resolve, reject) {
  if (bridgePromise === result) {
    return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
  }
  if (isPromise(result)) {
    if (result.status === PENDING) {
      result.then(y => resolvePromise(bridgePromise, y, resolve, reject), reject)
    } else {
      result.then(resolve, reject)
    }
  } else if (isThenable(result)) {
    result.then(y => resolvePromise(bridgePromise, y, resolve, reject), reject)
  } else {
    resolve(result)
  }
}
```
