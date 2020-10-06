---
title: Vue3 Compat
slug: /blogs/vue3-compat
date: 2020-09-30
author: ahabhgk
description: Vue3 Compat
tags:
  - SourceCode
  - Front End Framework
---

> drafting

Vue3 中内置组件和一些其他新特性的实现原理，作为上一篇的补充

## Fragment

```js:title=runtime-core/components/fragment.js {15,19,36-38}
export const Fragment = {
  patch(
    { mountChildren, patchChildren, renderOptions },
    { n1, n2, container, isSVG, anchor }
  ) {
    if (n1 == null) {
      const {
        createText: hostCreateText,
        insert: hostInsert,
      } = renderOptions
      const fragmentStartAnchor = n2.node = hostCreateText('')
      const fragmentEndAnchor = n2.anchor = hostCreateText('')
      hostInsert(fragmentStartAnchor, container, anchor)
      hostInsert(fragmentEndAnchor, container, anchor)
      mountChildren(n2, container, isSVG, fragmentEndAnchor)
    } else {
      n2.node = n1.node
      n2.anchor = n1.anchor
      patchChildren(n1, n2, container, isSVG)
    }
  },

  getNode(internals, { vnode }) { // 插入到它的前面，需要从头部拿
    return vnode.node
  },

  getNextSibling({ renderOptions }, { vnode }) { // nextSibling 需要从尾部拿
    return renderOptions.nextSibling(vnode.anchor)
  },

  move({ move, renderOptions }, { vnode, container, anchor }) {
    const { insert: hostInsert } = renderOptions
    const fragmentStartAnchor = vnode.node
    const fragmentEndAnchor = vnode.anchor
    hostInsert(fragmentStartAnchor, container, anchor)
    for (let child of vnode.children) {
      move(child, container, anchor)
    }
    hostInsert(fragmentEndAnchor, container, anchor)
  },

  unmount({ unmount, renderOptions }, { vnode, doRemove }) {
    const { remove: hostRemove } = renderOptions
    hostRemove(vnode.node)
    vnode.children.forEach(c => unmount(c, doRemove))
    hostRemove(vnode.anchor)
  },
}
```

这五个方法会在哪里调用可以看上一篇，有具体的讲解和代码，Fragment 就是直接将子节点进行渲染，本身可以用两个 placeholder 来标记头部和尾部，因为 Fragment 的 nextSibling 是尾部 placehoder 的 nextSibling，而 getNode 用于插入到 Fragment 前面，所以返回的是 Fragment 的头部 placeholder

## Teleport

Teleport 很像 Fragment，唯一的不同就是 Teleport 把子节点渲染到 target 节点上

```js:title=runtime-core/components/teleport.js {11-13,17,20-26}
export const Teleport = {
  patch(
    { renderOptions, mountChildren, patchChildren, move },
    { n1, n2, container, isSVG, anchor },
  ) {
    if (n1 == null) {
      const teleportStartAnchor = n2.node = renderOptions.createText('')
      const teleportEndAnchor = n2.anchor = renderOptions.createText('')
      renderOptions.insert(teleportStartAnchor, container, anchor)
      renderOptions.insert(teleportEndAnchor, container, anchor)
      const target = renderOptions.querySelector(n2.props.to)
      n2.target = target
      mountChildren(n2, target, isSVG, null)
    } else {
      n2.node = n1.node
      n2.anchor = n1.anchor
      n2.target = n1.target
      patchChildren(n1, n2, n2.target, isSVG)

      if (n1.props.to !== n2.props.to) {
        const target = renderOptions.querySelector(n2.props.to)
        n2.target = target
        for (let child of n2.children) {
          move(child, container, null)
        }
      }
    }
  },

  getNode(internals, { vnode }) {
    return vnode.node
  },

  getNextSibling({ renderOptions }, { vnode }) {
    return renderOptions.nextSibling(vnode.anchor)
  },

  move({ renderOptions, move }, { vnode, container, anchor }) {
    const { insert: hostInsert } = renderOptions
    const teleportStartAnchor = vnode.node
    const teleportEndAnchor = vnode.anchor
    hostInsert(teleportStartAnchor, container, anchor)
    hostInsert(teleportEndAnchor, container, anchor)
  },

  unmount({ renderOptions, unmount }, { vnode }) {
    const { remove: hostRemove } = renderOptions
    hostRemove(vnode.node)
    vnode.children.forEach(c => unmount(c))
    hostRemove(vnode.anchor)
  },
}
```

不同于 ReactDOM.createProtal 由于 ReactDOM 有一个事件的合成层，可以在这里做一些 hack，使 Portal 的父组件可以捕捉到 Portal 中的事件，Vue3、Preact 由于没有实现事件合成层，所以父组件不能捕捉到 Teleport 中的事件，但相应的减少了很多的代码量，包的体积减小很多

## Inject / Provide

直接看实现

```js:title=runtime-core/inject.js {12,14,23}
import { isFunction } from '../shared'
import { getCurrentInstance, getParentInstance } from './component'

export const provide = (key, value) => {
  const currentInstance = getCurrentInstance()
  if (!currentInstance) {
    console.warn(`provide() can only be used inside setup().`)
  } else {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent && currentInstance.parent.provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}

export const inject = (key, defaultValue) => {
  const currentInstance = getCurrentInstance()
  if (currentInstance) {
    const { provides } = currentInstance
    if (key in provides) {
      return provides[key]
    } else if (arguments.length > 1) { // defaultValue 可以传入 undefined
      return isFunction(defaultValue)
        ? defaultValue()
        : defaultValue
    } else {
      console.warn(`injection "${String(key)}" not found.`)
    }
  } else {
    console.warn(`inject() can only be used inside setup() or functional components.`)
  }
}
```

可以看出来 provides 是放在 instance 上的，每个 instance 的 provides 都是通过 `Object.create` 继承 parentInstance 的 provides

provide 调用时就是拿到 currentInstance，然后继承 currentInstance.parent 的 provides，再像上面通过 key 添加属性；inject 就是拿到 currentInstance 的 provides，再通过 key 取值即可，比较巧妙的就是 defaultValue 对于 undefined 的处理

之前我们的 runtime 并没有再 instance 上放 provides 属性，而且怎样去拿 parentInstance，接下来我们修改之前写的 runtime

```js:title=runtime-core/renderer.js {8,9}
const processComponent = (n1, n2, container, isSVG, anchor) => {
  if (n1 == null) {
    const instance = n2.instance = {
      // ...
      parent: null,
      provides: null,
    }
    const parentInstance = instance.parent = getParentInstance(instance)
    instance.provides = parentInstance ? parentInstance.provides : Object.create(null) // 没有 parentInstance 说明是根组件，它的 provides 我们初始化成空对象
  } // ...
}
```

```js:title=runtime/component.js {4}
export const getParentInstance = (instance) => {
  let parentVNode = instance.vnode.parent
  while (parentVNode != null) {
    if (parentVNode.instance != null) return parentVNode.instance
    parentVNode = parentVNode.parent
  }
  return null
}
```

源码中 parentInstance 是类似于 anchor 作为一个参数一层一层传下来的，之后的 parentSuspense 也是，我们这里尽量简化，通过判断 `.parent` 链中是否有 instance 进行查找

## onErrorCaptured

我们来实现我们唯一没有砍掉的钩子……

```js:title=runtime-core/error-handling.js {8,16,28}
import { getCurrentInstance } from './component'

export const onErrorCaptured = (errorHandler) => {
  const instance = getCurrentInstance()
  if (instance.errorCapturedHooks == null) { // 这样不用修改 renderer 中的代码了
    instance.errorCapturedHooks = []
  }
  instance.errorCapturedHooks.push(errorHandler)
}

export const callWithErrorHandling = (fn, instance, args = []) => {
  let res
  try {
    res = fn(...args)
  } catch (e) {
    handleError(e, instance)
  }
  return res
}

export const handleError = (error, instance) => {
  if (instance) {
    let cur = instance.parent
    while (cur) {
      const errorCapturedHooks = cur.errorCapturedHooks
      if (errorCapturedHooks) {
        for (let errorHandler of errorCapturedHooks) {
          if (errorHandler(error)) {
            return
          }
        }
      }
      cur = cur.parent
    }
  }
  console.warn('Unhandled error', error)
}
```

onErrorCaptured 就是添加错误处理的函数，通过 handleError 来从 `instance.parent` 中调用这些函数，知道返回 true 为止，而 callWithErrorHandling 是用来触发 handleError 的，我们对于用户可能出错的地方（可能有副作用的地方）调用时包裹一层 callWithErrorHandling 即可

```js:title=runtime-core/api-watch.js {4,10}
export const watchEffect = (cb, { onTrack, onTrigger } = {}) => {
  let cleanup
  const onInvalidate = (fn) => {
    cleanup = e.options.onStop = () => callWithErrorHandling(fn, instance)
  }
  const getter = () => {
    if (cleanup) {
      cleanup()
    }
    return callWithErrorHandling(cb, instance, [onInvalidate])
  }
  // ...
}
```

## Suspense

Vue3 在更新时遇到 Suspense 是在内存中创建一个 hiddenContianer，在内存中继续渲染 children，渲染 children 时如果遇到 async setup 会隐式的返回一个 Promise，Suspense 通过 register 接收这个 Promise，渲染完 children 后判断是否有接收 Promise，如果没有则把 hiddenContainer 中的 children 移动到 container 中，有则渲染 fallback 作为子节点，之后所有接收到的 Promise 在 resolve 之后再把 hiddenContainer 中的 children 移动到 container 中

在内存中创建 hiddenContainer 去渲染 children 是因为 Suspense 必须要根据是否有接收到 Promise 判断渲染 fallback 还是 children，而 Promise 只来自执行 children 中的 async setup

Suspense 的处理主要分为两部分，一部分是 Suspense 本身的处理，另一部分是对 async setup 子组件的处理，首先来看 Suspense 本身

```js:title=runtime-core/components/suspense.js {3,9-11,26-28}
const createSuspense = (vnode, container, isSVG, anchor, internals, hiddenContainer) => {
  const suspense = {
    deps: [],
    container,
    anchor,
    isSVG,
    hiddenContainer,
    resolve() {
      internals.unmount(vnode.props.fallback)
      internals.move(vnode.props.children, suspense.container, suspense.anchor)
      vnode.node = internals.getNode(vnode.props.children)
    },
    register(instance, setupRenderEffect) {
      // ...
    },
  }
  return suspense
}

export const Suspense = {
  patch(
    internals,
    { n1, n2, container, isSVG, anchor },
  ) {
    if (n1 == null) {
      const hiddenContainer = internals.renderOptions.createElement('div')
      const suspense = n2.suspense = createSuspense(n2, container, isSVG, anchor, internals, hiddenContainer)
      internals.mountChildren(n2, hiddenContainer, isSVG, null)
      internals.patch(null, n2.props.fallback, container, isSVG, anchor)
      n2.node = internals.getNode(n2.props.fallback)
      if (suspense.deps.length === 0) {
        suspense.resolve()
      }
    } else {
      // patchSuspense
    }
  },

  getNode(internals, { vnode }) {
    return vnode.node
  },

  getNextSibling({ renderOptions }, { vnode }) {
    return renderOptions.nextSibling(vnode.node)
  },

  move({ move }, { vnode, container, anchor }) {
    if (vnode.suspense.deps.length) {
      move(vnode.props.fallback, container, anchor)
    } else {
      move(vnode.props.children, container, anchor)
    }
    vnode.suspense.container = container
    vnode.suspense.anchor = anchor
  },

  unmount({ unmount }, { vnode, doRemove }) {
    if (vnode.suspense.deps.length) {
      unmount(vnode.props.fallback, doRemove)
    } else {
      unmount(vnode.props.children, doRemove)
    }
  },
}

export const getParentSuspense = (vnode) => {
  vnode = vnode.parent
  while (vnode) {
    if (vnode.type === Suspense) return vnode.suspense
    vnode = vnode.parent
  }
  return null
}
```

我们实现的很简陋，可以看到核心逻辑就是创建一个 hiddenContainer，在这里面渲染 children，然后 createSuspense 创建实例，resolve 的时候就是把 fallback unmount 掉再把 hiddContainer 中的移动到 container 中，move 的时候 container 和 anchor 会改变，会影响 resolve，所以 suspense 实例的属性也要进行修改，这时还有很重要的一部分 patchSuspense，但是跟原理相关性较小，就不写了

```js:title=runtime-core/renderer.js {5-16}
const processComponent = (n1, n2, container, isSVG, anchor) => {
  if (n1 == null) {
    // ...
    if (isPromise(render)) {
      const suspense = getParentSuspense(n2)
      const placeholder = instance.subTree = h(TextType, { nodeValue: '' })
      patch(null, placeholder, container, anchor)
      suspense.register(
        instance,
        () => setupRenderEffect(
          instance,
          internals.renderOptions.parentNode(instance.subTree.node),
          isSVG,
          internals.renderOptions.nextSibling(instance.subTree.node),
        ),
      )
    } else if (isFunction(render)) {
      setupRenderEffect(instance, container, isSVG, anchor)
    } else {
      console.warn('setup component: ', n2.type, ' need to return a render function')
    }

    function setupRenderEffect(instance, container, isSVG, anchor) {
      instance.update = effect(() => { // component update 的入口
        const renderResult = instance.render()
        const vnode = instance.vnode
        vnode.children = [renderResult]
        renderResult.parent = vnode
        patch(instance.subTree, renderResult, container, isSVG, anchor)
        instance.subTree = renderResult
      }, {
        scheduler: queueJob,
      })
    }
  } // ...
}
```

接下来对于 async setup 子组件的处理就要修改 runtime 了，我们对 setup 返回结果进行判断，如果是 Promise 就找到 parentSuspense 进行注册，这里我们抽离 setupRenderEffect，注册时传入一个回调函数，用于 suspense resolve 时继续渲染该子组件使用，同时创建一个 placeholder 给组件站位，用以 setupRenderEffect 中获取 container 和 anchor，因为 async setup 组件在没有 resolve 时可能有新的节点插入，如果 container、anchor 还是旧的值时可能会出错（anchor 为 null，但是之后插入了节点，resolve 时 anchor 还是 null 的话就导致节点顺序错误）

```js:title=runtime-core/components/suspense.js {6,9,12-18}
const createSuspense = (vnode, container, isSVG, anchor, internals, hiddenContainer) => {
  const suspense = {
    deps: [],
    // ...
    register(instance, setupRenderEffect) {
      suspense.deps.push(instance)
      instance.render
        .catch(e => {
          handleError(e, instance)
        })
        .then(renderFn => {
          instance.render = renderFn
          setupRenderEffect()
          const index = suspense.deps.indexOf(instance)
          suspense.deps.splice(index, 1)
          if (suspense.deps.length === 0) {
            suspense.resolve()
          }
        })
    },
  }
  return suspense
}
```

然后 register 就是将 async setup 组件实例加入到 suspense.deps 中，然后等 render resolve 时调用 setupRenderEffect 渲染该组件，并判断是否可以 resolve 了，这里 catch 后 handleError 是因为 async setup 可以执行副作用，可能会出错

## defineAsyncComponent

是一个高阶组件，相当于一个增强版的 lazy，当它的上层有 Suspense 时，就返回一个 Promise，否则返回相应状态的组件

```js:title=runtime-core/api-define-component.js {35-39,48,52}
export const defineAsyncComponent = (options) => {
  if (isFunction(options)) options = { loader: options }

  const {
    loader,
    errorComponent,
    suspensible = true,
    onError,
  } = options

  let resolvedComponent = null

  let retries = 0
  const retry = () => {
    retries++
    return load()
  }

  const load = () => loader()
    .catch(e => {
      if (onError) {
        return new Promise((resolve, reject) => {
          onError(
            e,
            () => resolve(retry()),
            () => reject(e),
            retries,
          )
        })
      } else {
        throw e
      }
    })
    .then((comp) => {
      if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
        comp = comp.default
      }
      resolvedComponent = comp
      return comp
    })

  return defineComponent((props) => {
    const instance = getCurrentInstance()
    if (resolvedComponent) return () => h(resolvedComponent, props)
    if (suspensible && getParentSuspense(instance.vnode)) {
      return load()
        .then(comp => {
          return () => h(comp, props)
        })
        .catch(e => {
          handleError(e, instance)
          return () => errorComponent ? h(errorComponent, { error: e }) : null
        })
    }
  })
}
```

先来看有 Suspense 的情况，类似于 lazy 的实现，作为一个高阶组件返回 Promise，在出错的时候如果有 onError 就通过 onError 交给用户处理，没有就继续抛出 error，后面 catch 住渲染 errorComponent

再补上没有 Suspense 的情况

```js:title=runtime-core/api-define-component.js {7-9,23,26-33,44-48}
export const defineAsyncComponent = (options) => {
  if (isFunction(options)) options = { loader: options }

  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout,
    suspensible = true,
    onError,
  } = options
  // ...

  return defineComponent((props) => {
    // ...

    const error = ref()
    const loading = ref(true)
    const delaying = ref(!!delay) // 延后出现 LoadingComponent

    if (delay) {
      setTimeout(() => delaying.value = false, delay)
    }
    if (timeout) {
      setTimeout(() => {
        // 超时
        if (loading.value && !error.value) {
          const err = new Error(`Async component timed out after ${timeout}ms.`)
          handleError(err, instance)
          error.value = err
        }
      }, timeout)
    }

    load()
      .then(() => loading.value = false)
      .catch(e => {
        handleError(e, instance)
        error.value = e
      })

    return () => {
      if (!loading.value && resolvedComponent) return h(resolvedComponent, props)
      // loading.value === true
      else if (error.value && errorComponent) return h(errorComponent, { error: error.value })
      else if (loadingComponent && !delaying.value) return h(loadingComponent)
      return null
    }
  })
}
```

这里通过判断 suspensible 为 false 或者没有 parentSuspense 返回 render function，根据相应的状态渲染相应的组件，delay 这个参数的作用是为了 delay 出现 loadingComponent 的，如果加载比较快就不用展示 loading

我们目前写的不能实现的一种情况是 suspensible 为 false 但是有 parentSuspense

```js
const ProfileDetails = defineAsyncComponent({
  loader: () => import('./async.jsx'),
  loadingComponent: defineComponent(() => () => <h1>Loading...</h1>),
  suspensible: false,
});

const App = {
  setup(props) {
    return () => (
      <Suspense fallback={<h1>Loading by Suspense</h1>}>
        <ProfileDetails />
      </Suspense>
    );
  },
};
```

这是因为 setupRenderEffect 传入的 container、anchor 是不变的，通过闭包存起来了，ProfileDetails 一开始渲染时是在 Suspense 中的，它的 container 是 hiddenContainer，之后渲染也是 hiddenContainer，所以导致页面空白，我们可以把 container、anchor 放到 instance 实例上，让这两个值可以改变，通过 instance 上的 container、anchor 进行渲染

## KeepAlive

## Transition

## block tree & patch flag
