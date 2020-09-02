---
title: vue/reactivity 响应式原理
slug: /blogs/vue-reactivity-source-code
date: 2020-08-28
author: ahabhgk
description: vue/reactivity 响应式原理
tags:
  - SourceCode
---

首先一起实现一个简易的 reactivity 吧，穿插着会提到源码中的一些细节，建议先跟着写写，细节可以 clone 下来 vue-next 打开源码跟着看

## ⭐️ reactive

首先是 `reactive`，它的作用是把一个对象变成响应式对象，更准确的说是 `Object, Array, Map, WeakMap, Set, weakSet` 这几种对象变为响应式

类似于 `reactive` 也有 `readonly`，将一个对象变为不可变对象

```js:title=reactivity/reactive.js
export function reactive(target) {
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers)
}

export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers)
}
```

> 实际上是可以 `readonly(reactive(obj))` 将一个 reactive 对象转换为 readonly 对象的，而 `reactive(readonly(obj))` 仍然返回 readonly 对象，实现是在 `reactive` 入口判断 target 是不是 readonly，是就直接返回，而 `readonly` 入口不做判断，可以将 reactive 对象在做一层代理，转换为 readonly
>
> ```js
> const original = reactive({ count: 0 })
> const copy = readonly(original)
>
> effect(() => {
>   // works for reactivity tracking
>   console.log(copy.count)
> })
>
> // mutating original will trigger watchers relying on the copy
> original.count++
> // mutating the copy will fail and result in a warning
> copy.count++ // warning!
> ```
>
> 对于这种情况是在 reactive 代理上在加了一层 readonly 代理，当 readonly 对象的 get 触发时会调用 reactive 对象的 get 以触发 track，之后原 reactive 对象修改后对于 readonly 对象的 effect 就也会触发

这两种对象实现是相似的，我们通过 `createReactiveObject` 创建这两种对象，但在这之前我们先定义一些常量和工具函数

```js:title=shared/index.js
export const isObject = (value) => typeof value === 'object' && value !== null
```

```js:title=reactivity/reactive.js
// proxy 实例上的标识
export const ReactiveFlags = {
  IS_REACTIVE: '__v_isReactive',
  IS_READONLY: '__v_isReadonly',
  RAW: '__v_raw', // 原对象
}

const TargetType = {
  COMMON: 'COMMON', // 表示 Object 和 Array
  COLLECTION: 'COLLECTION', // 表示 Map、Set、WeakMap、WeakSet
  INVALID: 'INVALID', // 其他不处理的
}

// 判断类型
const getTargetType = (target) => {
  const getTypeString = (target) => {
    return Object.prototype.toString.call(target).slice(8, -1)
  }
  const typeString = getTypeString(target)
  switch (typeString) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION
    default:
      return TargetType.INVALID
  }
}

export function toRaw(ob) {
  return (ob && toRaw(ob[ReactiveFlags.RAW])) || ob
}
```

`ReactiveFlags` 是 proxy 上的一些常量的定义。对于 target 类型的判断，在 `createReactiveObject` 中对于 COMMON 和 COLLECTION 有不同的 handlers 来处理。toRaw 用来取一个 reactive 对象的原对象，通过递归实现，非常巧妙

下面来看 `createReactiveObject` 的实现

```js:title=reactivity/reactive.js
export const reactiveMap = new WeakMap()
export const readonlyMap = new WeakMap()

function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers) {
  if (!isObject(target)) {
    throw new Error(`value cannot be made reactive: ${String(target)}`)
  }
  if (
    target[ReactiveFlags.RAW] && // 已经是 reactive 或 readonly 对象
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE]) // 排除 readonly(reactiveObj) 这种情况
  ) {
    return target
  }
  // 已经有了对应的 proxy
  const proxyMap = isReadonly ? readonlyMap : reactiveMap
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  // 获取 typeString 判断是不是 collectionType（Map、Set、WeakMap、WeakSet）
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }

  const observed = new Proxy(
    target,
    // Map、Set、WeakMap、WeakSet 通过 collectionHandlers 代理，Object、Array 通过 baseHandlers 代理
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )
  proxyMap.set(target, observed) // 存对应 proxy
  return observed
}
```

可以看到通过两个 WeakMap 来存对象对应的 reactive 实例和 readonly 实例，再次调用时就可以直接返回

然后通过 Proxy 进行代理，我们先看对于 Object 和 Array 的代理 mutableHandlers 和 readonlyHandlers

## 🌥 baseHandlers

```js:title=reactivity/baseHandlers.js
const get = createGetter()
const readonlyGet = createGetter(true)

const set = createSetter()

export const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
}

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(
      `Set operation on key "${String(key)}" failed: target is readonly.`,
      target
    )
    return true
  },
  deleteProperty(target, key) {
    console.warn(
      `Delete operation on key "${String(key)}" failed: target is readonly.`,
      target
    )
    return true
  },
}
```

可以看到 readonly 与 reactive 的不同就在于 readonly 代理的修改操作，修改时不会真正去修改对象，并在开发模式下报警告；readonly 代理的 get、has、ownKeys 操作不会去 track 收集依赖，get 比较特殊，has、ownKeys 可以直接用原对象操作就不会 track，直接不加即可

> 呜呜呜～ 我的 PR 没被 merge：[PR: readonly object should not track on 'has' and 'ownKeys'](https://github.com/vuejs/vue-next/pull/2002)

对于 get、readonlyGet 和 set 则是通过 createGetter 和 createSetter 创建

```js:title=reactivity/baseHandlers.js {13,15,26}
function createGetter(isReadonly = false) {
  return function get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
    if (key === ReactiveFlags.IS_READONLY) return isReadonly
    if (
      key === ReactiveFlags.RAW &&
      receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)
    ) {
      return target
    }

    const res = Reflect.get(target, key, receiver)
    if (!isReadonly) track(target, TrackOpTypes.GET, key)
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {
    const oldValue = target[key]
    const res = Reflect.set(target, key, value, receiver)
    if (target === receiver[ReactiveFlags.RAW] && hasChanged(value, oldValue)) {
      trigger(target, TriggerOpTypes.SET, key)
    }
    return res
  }
}
```

这两个函数通过 isReadonly 的不同创建不同的 getter 和 setter，形成闭包存 isReadonly 的值，返回的 getter 代理 reactive 对象和 readonly 对象的 get 操作，当 key 是 `__v_isReactive`、`__v_raw`、`__v_isReadonly` 这几个 ReactiveFlags 常量时，就直接通过参数返回对应的结果，所以这几个常量并没有挂载在 proxy 实例上，而是通过代理 get 操作实现，保证了 proxy 实例上没有多余的属性

> setter 并没有传 isReadonly，这里实际上并不需要 createSetter 实现，但在源码中还有 shallowReactive 的情况，需要判断 isShallow，这里为了精简省略了 shallow 对应的实现

之后就是代理后主要的操作了，首先通过 `Reflect.get` 取得 value，然后进行 track，也就是依赖收集，track 其实是实现响应式的前半部分，后半部分就是 trigger 触发依赖

最后判断 value 是否是对象，如果是就进行对应的 reactive 或 readonly，这样在结果处进行响应式，lazy 的进行深度递归，实现深度响应式的同时，也防止了循环引用导致的无限递归

> Proxy 的代理只能代理一层，是浅的，reactive 实现的是深度响应式
>
> 源码中 reactive Object get 取出来如果是 ref 会自动返回 value，reactive Array 则不会，详细可以看看 [Issues: Stable mutation of reactive arrays containing refs](https://github.com/vuejs/vue-next/issues/737)
>
> 源码中 arrayInstrumentations 的原因可以看这个 [commit 的 test case](https://github.com/vuejs/vue-next/commit/aefb7d282ed716923ca1a288a63a83a94af87ebc#diff-29cbe9d04db941aad894beed12b88ff1)

setter 代理操作也类似，先通过 `Reflect.set` 得到 set 的结果，然后 trigger 触发依赖，最后返回结果，这里一定要先执行 set 后再 trigger，effect 中可能有操作依赖于 set 后的对象，先 set 能保证 effect 中的函数执行出正确的结果

其他的 deleteProperty、has、ownKeys 也类似，得到结果然后触发 track 或 trigger，最后返回结果。deleteProperty 类似 set 会触发依赖比较好理解，那 has、ownKeys 为什么会收集依赖呢？因为有时需要判断 proxy 是否有 key 属性，或者依赖于 proxy 的 keys 等情况，在新增和删除 key 时就需要触发对应的 effect

```js
effect(() => console.log(Object.keys(proxy)))
effect(() => console.log(key in proxy))
```

代理 ownKeys 时只有一个 target 参数，ownKeys 的操作并不需要 key，但是 track 和 trigger 至少需要 target 和对应的 key 以找到依赖，这时可以定义一个 `ITERATE_KEY` 常量，专门处理这种遍历而不需要 key 的情况

```js:title=reactivity/baseHandlers.js
export const ITERATE_KEY = Symbol('iterate')

function ownKeys(target) {
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

> 所以什么是响应式对象呢？个人理解响应式对象与普通对象的区别就在于响应式对象的操作可以通过 proxy 代理以**调用 track 收集依赖或调用 trigger 触发依赖**

## 🚀 effect

上面提到很多次依赖收集和触发依赖了，那到底什么是依赖呢？依赖其实就是 effect 函数，我们先看 track 的实现

```js:title=reactivity/effect.js {19,20}
const targetMap = new WeakMap()

let activeEffect

export function track(target, type, key) {
  if (activeEffect == null) return

  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}
```

首先判断当前的 activeEffect 有没有，没有就直接返回，之后通过 targetMap 拿到 target 对应的 depsMap，再通过 depsMap 拿到 key 对应的 dep，dep 是一个 Set，存储 `target.key` 需要的 effect 依赖，而 effect 又通过 deps 数组存储依赖于 effect 的所有 dep，建立一个双向的收集，dep 到 effect 是为了 trigger 使用，而 effect 到 dep 是为了 effect 调用时找到依赖于这个 effect 所有 dep，从 dep 中删除这个调用过的 effect，用来清除上一轮的依赖，防止本轮触发多余的依赖

```js:title=reactivity/effect.js {4,21-29}
export function effect(fn, options = {}) {
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect()
  }
  return effect
}

// 停止监听
export function stop(effect) {
  if (effect.active) {
    cleanup(effect)
    effect.active = false
  }
}

function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    if (!effect.active) return effect.options.scheduler ? undefined : fn()
    if (!effectStack.includes(effect)) {
      cleanup(effect) // effect 调用时会清除上一轮的依赖，防止本轮触发多余的依赖
      try {
        effectStack.push(effect) // 可能有 effect 中调用另一个 effect 的情况，模拟一个栈来处理
        activeEffect = effect
        return fn() // let value = effect() 将函数的结果返回，可以从外面去到结果
      } finally {
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.active = true // active 判断 effect 是否还活着，stop(effect) 后 active 就是 false
  effect.deps = [] // 收集对应的 dep，cleanup 时以找到 dep，从 dep 中清除 effect
  effect.options = options // 存放 onTrack、onTrigger、onStop 等钩子函数，为了精简我们只实现 scheduler
  return effect
}

function cleanup(effect) {
  const { deps } = effect
  deps.forEach(dep => dep.delete(effect)) // deps 中的 dep 清 effect
  deps.length = 0 // 清空 effect 的 deps
}
```

可以看到 effect API 传入一个函数，effect API 通过 createReactiveEffect 创建一个 effect 函数，并返回这个函数，这个函数的返回值就是传入 effect API 函数的结果，只不过在调用 effect 函数时会把 activeEffect 赋值为当前这个调用中的 effect，并在调用结束后把 activeEffect 改回去

effect 函数创建后如果不是 lazy 的会首先执行一次，这次执行是为了调用 fn，触发 get 等代理，以先收集一遍依赖，先 track 了之后再 trigger 才能有依赖来触发，如果 options 传入了 lazy 为 true，就需要保证先手动执行一遍 effect 函数来收集依赖

effect API 其实是一个比较底层的函数，我们平时使用都是用 watchEffect 和 watch，这两个都是基于 effect 实现的，比如调用这两个函数返回的是一个 stop 函数用来停止监听，其实就是对上面的一个封装，但为什么 effect API 不直接返回一个 stop 函数，而是返回一个 effect 函数？因为 effect 函数可以取传入函数的结果，其他一些 API 的实现需要这个结果，所以 effect API 和 stop 函数设计成了分开的

下面我们看 trigger 的实现

```js:title=reactivity/effect.js {6,29-33}
export function trigger(target, type, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  // 需要新建一个 set，如果直接 const effect = depsMap.get(key)
  // effect 函数执行时 track 的依赖就也会在这一轮 trigger 执行，导致无限循环
  const effects = new Set()
  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        // 不要添加自己当前的 effect，否则之后 run（mutate）的时候
        // 遇到 effect(() => foo.value++) 会导致无限循环
        if (effect !== activeEffect) effects.add(effect)
      })
    }
  }
  // SET | ADD | DELETE
  if (key !== undefined) {
    add(depsMap.get(key))
  }
  const shouldTriggerIteration =
    (type === TriggerOpTypes.ADD) ||
    (type === TriggerOpTypes.DELETE)
  // iteration key on ADD | DELETE
  if (shouldTriggerIteration) {
    add(depsMap.get(isArray(target) ? 'length' : ITERATE_KEY))
  }

  effects.forEach((effect) => {
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  })
}
```

也很好理解，就是新建一个 Set，存通过 targetMap 和 depsMap 拿到的依赖（effect 函数），要注意不能将当前的 activeEffect 添加进去，否则可能会无限循环，同时针对触发 trigger 的不同方式（type）也有不同的添加方式，比如在新增或删除 key 导致 trigger 时需要把 length 或 `ITERATE_KEY` 的依赖也添加进去，对应上面 track `ITERATE_KEY`，最后依次执行即可

为什么需要新建一个 Set，而不直接用 `targetMap.get(target).get(key).forEach(run)` 呢？因为 effect 函数在执行的过程中会继续 track 向 depsMap 的 dep 中添加依赖，导致这里一直 trigger effect，effect 中又一直 track，无限循环

> 为什么不能解构？由于是通过 Proxy 代理对象的 get 操作，相当于 `proxy.key` 每次都这样访问数据才能成功收集到依赖，解构的话是 `let key = proxy.key` 获取了 key 的值，之后通过 key 访问数据没有进入代理的 get 操作，所以不会收集到依赖

最后我们来看一个例子，走一遍整体的流程，以便更好的理解

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Counter</title>
</head>
<body>
  <div class="count"></div>
  <button class="inc">+</button>
  <button class="dec">-</button>
<script type="module">
  import { reactive, effect } from '../../packages/reactivity/index.js'

  const $inc = document.querySelector('.inc')
  const $dec = document.querySelector('.dec')
  const $count = document.querySelector('.count')

  const obj = { count: 0 }
  const state = reactive(obj)

  effect(() => {
    $count.innerHTML = state.count
  })

  $inc.addEventListener('click', () => {
    state.count++
  })

  $dec.addEventListener('click', () => {
    state.count--
  })
</script>
</body>
</html>
```

这里首先用 reactive 定义 state，传入 effect，然后 effect 会先执行一遍，将 activeEffect 设置为它，然后 cleanup 一遍，因为本来就是空的所以也没什么用，之后执行到 `$count.innerHTML = state.count` 触发 state 的 get 代理，get 中调用 `track(obj, TrackOpTypes.GET, 'count')`，将 activeEffect 收集到 dep（`targetMap.set(obj, depsMap.set('count', activeEffect))`）中，最后赋值 activeEffect 为 undefined，到此 effect 首次执行完毕

然后绑定好事件，之后点击触发事件会触发 state 的 set 代理，调用 `trigger(obj, TriggerOpTypes.SET, 'count')`，依次执行刚刚收集好的 effects，触发依赖，也就是执行 `effect(() => { $count.innerHTML = state.count) }`，其中 effect 执行时更上面第一次执行一样，设置 activeEffect 然后 cleanup 上一次的依赖，再访问 `state.count` 触发 get 代理，再把 activeEffect track 起来，完成依赖收集，最后重新设置 activeEffect

所以流程基本上是这样的：(track effects) => (trigger effects, track effects) => (trigger effects, track effects) => ...

现在已经讲完了响应式的核心原理，剩下的来讲一下 collectionHandlers、ref、computed

## ☁️ collectionHandlers

为什么 Map、Set、WeakMap、WeakSet 需要另一种 handlers 来处理呢？因为这些类型的 key 都是固定的，比如调用 map.set、map.get、map.has、map.delete 都会触发代理的 get 操作，set、get、has、delete 这些就是他们 key，只有 `map.get = ...` 才能触发代理的 set 操作，所以就需要 collectionHandlers 代理 get，针对不同的 key 进行不同的代理

```js:title=reactivity/collectionHandlers.js
export const mutableCollectionHandlers = {
  get: createInstrumentationGetter(false),
}
export const readonlyCollectionHandlers = {
  get: createInstrumentationGetter(true),
}
```

同样的通过 createInstrumentationGetter 传入 isReadonly 创建不同的 handlers

```js:title=reactivity/collectionHandlers.js
function createInstrumentationGetter(isReadonly) {
  const instrumentations = createInstrumentation(isReadonly)
  
  return (target, key, receiver) => {
    if (key === ReactiveFlags.IS_REACTIVE) return !isReadonly
    if (key === ReactiveFlags.IS_READONLY) return isReadonly
    if (key === ReactiveFlags.RAW) return target

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver,
    )
  }
}
```

这里创建真正的 instrumentations 来处理 get 的代理操作，注意 Reflect.get 的第三个参数 receiver 指 proxy 实例，用来指定 instrumentations 中的 this

```js:title=reactivity/collectionHandlers.js {3}
const createInstrumentation = (isReadonly) => ({
  get(key) {
    return get(this, key, isReadonly) // 通过 Reflect 调用时 this 是 receiver（proxy 实例）
  },
  get size() {
    return size(this, isReadonly)
  },
  has(key) {
    return has(this, key, isReadonly)
  },
  add(value) {
    return add(this, value, isReadonly)
  },
  set(key, value) {
    return set(this, key, value, isReadonly)
  },
  delete(key) {
    return deleteEntry(this, key, isReadonly)
  },
  clear() {
    return clear(this, isReadonly)
  },
  forEach(callback, thisArg) {
    return forEach(this, callback, thisArg, isReadonly)
  },
  keys(...args) {
    return createIterableMethod('keys', isReadonly)(this, ...args)
  },
  values(...args) {
    return createIterableMethod('values', isReadonly)(this, ...args)
  },
  entries(...args) {
    return createIterableMethod('values', isReadonly)(this, ...args)
  },
  [Symbol.iterator](...args) {
    return createIterableMethod(Symbol.iterator, isReadonly)(this, ...args)
  },
})
```

我们只实现 get、set 和 iterator 这几个方法

```js:title=reactivity/collectionHandlers.js {3,4,6}
// Set, WeakSet, Map, WeakMap
const get = (target, key, isReadonly) => {
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  !isReadonly && track(rawTarget, TrackOpTypes.GET, rawKey)
  const res = rawTarget.get(rawKey)
  if (isObject(res)) {
    return isReadonly ? readonly(res) : reactive(res)
  }
  return res
}
```

首先看 get，target 参数就是传入的 this，就是 Reflect.get 传入的 receiver，也就是 proxy 实例，先通过 toRaw 得到原对象和原 key，由于对象和数组的 key 都是基本类型，不会是响应式对象，所以可以直接通过 key 来 track，而 collectionType 的 key 可能是引用类型，可能是响应式对象，所以为了保证 track 和 trigger 的 key 是同一个，就要都用原对象或响应式对象，如果使用响应式对象又有的对象并不是响应式的，在转成响应式消耗了内存，所以都通过 rawTarget 和 rawKey 来 track 和 trigger

同样结果如果是对象需要返回结果的响应式版本

```js:title=reactivity/collectionHandlers.js {4-8}
// Map, WeakMap
const set = (target, key, value, isReadonly) => {
  if (isReadonly) throw new Error(`operation SET failed: target is readonly.`)
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  const rawValue = toRaw(value)
  const hadKey = rawTarget.has(rawKey)
  const res = rawTarget.set(rawKey, rawValue)
  if (hadKey) {
    trigger(rawTarget, TriggerOpTypes.ADD, rawKey)
  } else {
    trigger(rawTarget, TriggerOpTypes.SET, rawKey)
  }
  return res
}
```

set 是只有 Map 和 WeakMap 有的，Set、WeakSet 对应的是 add，这两个实现类似，也是先找到 rawTarget 和 rawKey，然后在 trigger 之前求出结果，并判断原来是否有 rawKey，进行对应的 trigger，如果原来没有就是新增了 key，对依赖于 iterator 操作的 effect 会有影响，所以需要区分来处理

> 1. 源码中会判断 key !== rawKey，如果是 true 就再 track 一遍 key，具体可以看 [Issues: Effect don't work when use reactive to proxy a Map which has reactive object as member's key.](https://github.com/vuejs/vue-next/issues/919)
>
> 2. 源码中也对 `readonly(reactive(obj))` 进行了处理，先通过 `target = (target as any)[ReactiveFlags.RAW]` 拿到 reactive 对象，然后通过 toRaw 以保证拿到 rawTarget，后面再通过 target.get 取值，进行相应的 track

```js:title=reactivity/collectionHandlers.js {4,10-25}
const createIterableMethod = (method, isReadonly) => {
  return (target, ...args) => {
    const rawTarget = toRaw(target)
    const rawIterator = rawTarget[method](...args)
    const wrap = (value) => {
      if (isObject(value)) return isReadonly ? readonly(value) : reactive(value)
      return value
    }
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
    return {
      // iterator protocol
      next() {
        const { value, done } = rawIterator.next()
        return done
          ? { value, done }
          : {
            value: method === 'entries' ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done,
          }
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this // 返回拦截的 Iterator：rawIterator -> proxyIterator(this)
      },
    }
  }
}
```

也比较好理解，就是类似上面的自己实现了 iterator 接口，需要注意 `[Symbol.iterator]` 方法返回的 this 就是这个对象，指我们实现的 proxyIterator 而不是 rawIterator

> 源码中对于 `MAP_KEY_ITERATE_KEY` 的处理可以看看这个 [commit](https://github.com/vuejs/vue-next/commit/45ba06ac5f49876b4f05e5996f595b2c4a761f47)，map 在 set 一个已有的 key 时不能触发 key 的 iterator 相关 effect

## 💫 ref

```js
export const ref = (value) => reactive({ value }) // 简易 ref
```

在现在的基础上实现没有优化的 ref 和 computed 就很简单了，但是 Vue 对他们的优化还是很值得学习的

```js:title=reactivity/ref.js {3,4}
export function customRef(factory) {
  const { get, set } = factory(
    () => track(ref, TrackOpTypes.GET, 'value'),
    () => trigger(ref, TriggerOpTypes.SET, 'value'),
  )
  const ref = {
    __v_isRef: true,
    get value() {
      return get()
    },
    set value(v) {
      set(v)
    },
  }
  return ref
}
```

我们先实现 customRef，他的参数是一个接收封装好的 track 和 trigger 函数的函数，用来生成 ref 的 get value 方法和 set value 方法

```js:title=reactivity/ref.js {8}
export function ref(value) {
  return customRef((track, trigger) => ({
    get: () => {
      track()
      return value
    },
    set: (newValue) => {
      value = newValue
      trigger()
    },
  }))
}
```

接着 ref 实现就简单了，就是在 get 时 track，set 时 trigger，而 value 的值通过创建的闭包保存

## ☄️ computed

最后看一下 computed 的实现，其实 computed 也是一个 customRef

```js:title=reactivity/computed.js
export function computed(options) {
  let getter
  let setter
  if (isFunction(options)) {
    getter = options
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    getter = options.get
    setter = options.set
  }

  return createComputedRef(getter, setter)
}
```

首先在入口判断是否传入了 setter，如果没有就相当于触发 set 的时候只报一个警告，通过 createComputedRef 创建

```js:title=reactivity/computed.js {3,6-12,16-21}
function createComputedRef(getter, setter) {
  let dirty = true
  let value // 通过闭包存
  const computedRef = customRef((track, trigger) => {
    const computeEffect = effect(getter, {
      lazy: true,
      scheduler() {
        if (!dirty) {
          dirty = true
          trigger()
        }
      },
    })
    return {
      get: () => {
        if (dirty) {
          value = computeEffect()
          dirty = false
        }
        track()
        return value
      },
      set: (newValue) => {
        setter(newValue)
      },
    }
  })
  return computedRef
}
```

首先 dirty 一开始是 true，创建 computedRef 时先创建 computeEffect，传入的函数就是我们的 getter，Vue 对于 computed 的优化就在于在需要它的值时才去计算它的值，每次都会计算出最新的，省略了一些没用的值的计算，比如说我改变了三次 computed 依赖的值，但渲染时只需要它最新的第三次的值，那么前两次就不会去计算。为了实现这个我们的 computeEffect 就需要设置成 lazy 的，首次不需要执行 computeEffect，同时 dirty 是 true，真正第一次 get computedRef 时才会手动触发 computeEffect，运行 getter 函数，对 getter 函数中的依赖进行 track，然后返回结果赋值给 value，这里 effect 函数不返回 stop 函数而是返回结果的作用就体现出来了，之后回到 get 方法中继续 track computedRef.value 的依赖，这样下次 getter 中依赖的响应式对象触发 set 代理就会 trigger，进入到 scheduler 中，在 scheduler 中再 trigger 依赖于 computedRef 的依赖，以此实现 computed

大致流程就是：

1. (first get computed, call computeEffect, track getter dep, set new value, track computed value, return value) =>

2. (second get computed, dirty is false, return value) =>

3. (set getter dep, trigger getter dep, scheduler, trigger computed value) =>

4. (third get computed, call computeEffect, track getter dep, set new value, track computed value, return value) => ...

## 😃 ramble

前几天在知乎上提了一个问题：[Vue3 composition-api 有哪些劣势？](https://www.zhihu.com/question/416652570)，因为是很久之前看的 RFC，忘记了 RFC 中有提到劣势的内容，但是看回答基本上也都是 RFC 中提到过的

首先是 ref 的心智负担，在读源码时可以从 reactive 对象 get 取出来如果是 ref 会自动返回 value 可以看出 Vue 是想将 ref 当作一种新的基本类型，对应 reactive 响应式的引用类型

```js
let count = ref(0)
count++
console.log(count) // 1
```

但是由于 JavaScript 的不足而没有实现，我也尝试写了 babel macro 去弥补这种不足，但由于难以结合生态就没有写完，而且如果使用 TypeScript 通过类型提示基本没有什么负担

然后是不能解构，因为 setup 只会运行一次，通过 proxy.key 才能成功 track 或 trigger，如果将解构赋值（取值）写到 render function 中，每次渲染都会重新取值，就能使用解构，但这样代码反而更乱

最后是更多的灵活性来自更多的自我克制，我很同意这句话：**编写有组织的 JavaScript 代码的技能直接转化为了编写有组织的 Vue 代码的技能**

> [simple-vue/reactivity 实现完整代码](https://github.com/ahabhgk/simple-vue3/tree/master/packages/reactivity)
