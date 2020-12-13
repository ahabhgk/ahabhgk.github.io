---
title: Vue3 Compat
slug: /blog/vue3-compat
date: 2020-09-30
author: ahabhgk
description: Vue3 Compat
tags:
  - SourceCode
  - Front End Framework
---

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
import { getCurrentInstance } from './component'

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
    const parentInstance = instance.parent = getParentInstance(n2)
    instance.provides = parentInstance ? parentInstance.provides : Object.create(null) // 没有 parentInstance 说明是根组件，它的 provides 我们初始化成空对象
  } // ...
}
```

```js:title=runtime/component.js {4}
export const getParentInstance = (vnode) => {
  let parentVNode = vnode.parent
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

```jsx
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

建立一个 Map 作为缓存，以子节点的 key 或 type 作为缓存的 key（`const key = vnode.key == null ? vnode.type : vnode.key`）；KeepAlive 的 render function 被调用时，也就是 KeepAlive 被渲染时，会根据 props 的 includes 和 excludes 规则判断 children 是否可以被缓存，不可以就直接渲染，可以就在缓存里找，如果缓存里有就用缓存中的进行渲染，children 的状态都是旧的在缓存中的，否则用新的 children 并进行缓存

```js {11-13,17-19}
if (cachedVNode) {
  // copy over mounted state
  vnode.el = cachedVNode.el
  vnode.component = cachedVNode.component
  if (vnode.transition) {
    // recursively update transition hooks on subTree
    setTransitionHooks(vnode, vnode.transition!)
  }
  // avoid vnode being mounted as fresh
  vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
  // make this key the freshest
  keys.delete(key)
  keys.add(key)
} else {
  keys.add(key)
  // prune oldest entry
  if (max && keys.size > parseInt(max as string, 10)) {
    pruneCacheEntry(keys.values().next().value)
  }
}
```

源码中 KeepAlive 的缓存用到了 LRU 算法，keys 是一个 Set，可以看到每次使用缓存时会刷新一下缓存，变成新鲜的，如果再来新缓存时，缓存超过了 max，就删去最陈旧的缓存，利用 Set 对 LRU 进行了简易的实现

## Transition

Transition 是通过给 DOM 节点在合适时机添加移除 CSS 类名实现的，对于不同平台有不同的实现方法，Transiton 是针对浏览器平台对 BaseTransition 的封装

```ts
// DOM Transition is a higher-order-component based on the platform-agnostic
// base Transition component, with DOM-specific logic.
export const Transition: FunctionalComponent<TransitionProps> = (
  props,
  { slots }
) => h(BaseTransition, resolveTransitionProps(props), slots)

export function resolveTransitionProps(
  rawProps: TransitionProps
): BaseTransitionProps<Element> {
  // 拿到对应的 CSS 类名
  let {
    name = 'v',
    type,
    css = true,
    duration,
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    appearFromClass = enterFromClass,
    appearActiveClass = enterActiveClass,
    appearToClass = enterToClass,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`
  } = rawProps
  // ...
  // 重写 hooks 回调函数，根据对应的添加或移除 CSS 类名
  return extend(baseProps, {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el)
      addTransitionClass(el, enterActiveClass)
      addTransitionClass(el, enterFromClass)
    },
    onBeforeAppear(el) {
      onBeforeAppear && onBeforeAppear(el)
      addTransitionClass(el, appearActiveClass)
      addTransitionClass(el, appearFromClass)
    },
    // ...
  } as BaseTransitionProps<Element>)
}
```

BaseTransition 做的就是从 props 传入的 hooks 通过 resolveTransitionHooks 进一步进行封装，封装成针对 diff 阶段各个时机进行调用的 hooks（beforeEnter、enter、leave、afterLeave、delayLeave、clone），setTransitionHooks 就是把这些 hooks 放到 vnode 上，以便在 diff 过程中进行调用

```ts {29-35,45-52}
const BaseTransitionImpl = {
  name: `BaseTransition`,

  props: {
    // ...
  },

  setup(props: BaseTransitionProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const state = useTransitionState()
    // ...

    return () => {
      const children =
        slots.default && getTransitionRawChildren(slots.default(), true)
      // ...

      // at this point children has a guaranteed length of 1.
      const child = children[0]
      // ...

      // in the case of <transition><keep-alive/></transition>, we need to
      // compare the type of the kept-alive children.
      const innerChild = getKeepAliveChild(child)
      if (!innerChild) {
        return emptyPlaceholder(child)
      }

      const enterHooks = resolveTransitionHooks(
        innerChild,
        rawProps,
        state,
        instance
      )
      setTransitionHooks(innerChild, enterHooks)

      const oldChild = instance.subTree
      const oldInnerChild = oldChild && getKeepAliveChild(oldChild)
      // ...
      if (
        oldInnerChild &&
        oldInnerChild.type !== Comment &&
        (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)
      ) {
        const leavingHooks = resolveTransitionHooks(
          oldInnerChild,
          rawProps,
          state,
          instance
        )
        // update old tree's hooks in case of dynamic transition
        setTransitionHooks(oldInnerChild, leavingHooks)
        // ...
      }

      return child
    }
  }
}
```

调用的时机就是有关 vnode 节点位置改变的时候，分别是 mount、move 和 unmount。mount 时就调用 BeforeEnter，并注册 enter 到 post 任务队列中；unmount 时就调用 leave 和 afterLeave，并注册 delayLeave 到 post 任务队列中；move 根据 moveType 的不同调用的也不同，比如 Suspense 中 resolve 时是把 children 从 hiddContainer 移到 container 中，相当于 mount，KeepAlive 的 activate 相当于 mount，deactivate 相当于 unmount

## Ref

ref（指 runtime 的 ref）是用来拿到宿主环境的节点实例或者组件实例的

```js:title=runtime-core/renderer.js {7,19,20}
const setRef = (ref, oldRef, vnode) => {
  // unset old ref
  if (oldRef != null && oldRef !== ref) {
    if (isRef(oldRef)) oldRef.value = null
  }
  // set new ref
  const value = getRefValue(vnode)
  if (isRef(ref)) {
    ref.value = value
  } else if (isFunction(ref)) {
    callWithErrorHandling(ref, getParentInstance(vnode), [value])
  } else {
    console.warn('Invalid ref type:', value, `(${typeof value})`)
  }
}

const getRefValue = (vnode) => {
  const { type } = vnode
  if (isSetupComponent(type)) return vnode.instance
  if (isString(type) || isTextType(type)) return vnode.node
  return type.getRefValue(internals, { vnode })
}
```

ref 的更新由于传入的 ref（指响应式 ref 用来接收实例）可能不同（`<img ref={num % 2 ? imgRef1 : imgRef2} />`），所以要先清空 oldRef，再赋值 newRef

```js:title=runtime-core/renderer.js
const patch = (n1, n2, container, isSVG, anchor = null) => {
  // ...
  if (n2.ref != null) {
    setRef(n2.ref, n1?.ref ?? null, n2)
  }
}

const unmount = (vnode, doRemove = true) => {
  const { type, ref } = vnode
  if (ref != null) {
    setRef(ref, null, vnode)
  }
  // ...
}
```

ref 的更新主要在两个地方，一个是在 patch 之后，也就是更新 DOM 节点或组件实例之后，保证拿到最新的值，另一个是在 unmount 移除节点之前

## Complier 优化

没有比 [Vue3 Compiler 优化细节，如何手写高性能渲染函数](https://zhuanlan.zhihu.com/p/150732926)这篇写的更好的了

这里简单说一下原理

1. **Block Tree 和 PatchFlags**

    编译时生成的代码会打上 patchFlags，用来标记动态部分的信息

    ```ts
    export const enum PatchFlags {
      // Indicates an element with dynamic textContent (children fast path)
      TEXT = 1,

      // Indicates an element with dynamic class binding.
      CLASS = 1 << 1,

      // Indicates an element with dynamic style
      STYLE = 1 << 2,

      // Indicates an element that has non-class/style dynamic props.
      // Can also be on a component that has any dynamic props (includes
      // class/style). when this flag is present, the vnode also has a dynamicProps
      // array that contains the keys of the props that may change so the runtime
      // can diff them faster (without having to worry about removed props)
      PROPS = 1 << 3,

      // Indicates an element with props with dynamic keys. When keys change, a full
      // diff is always needed to remove the old key. This flag is mutually
      // exclusive with CLASS, STYLE and PROPS.
      FULL_PROPS = 1 << 4,

      // Indicates an element with event listeners (which need to be attached during hydration)
      HYDRATE_EVENTS = 1 << 5,

      // Indicates a fragment whose children order doesn't change.
      STABLE_FRAGMENT = 1 << 6,

      // Indicates a fragment with keyed or partially keyed children
      KEYED_FRAGMENT = 1 << 7,

      // Indicates a fragment with unkeyed children.
      UNKEYED_FRAGMENT = 1 << 8,

      // ...
    }
    ```

    创建的 Block 也会有 dynamicProps、dynamicChildren 表示动态的部分，Block 也是一个 VNode，只不过它有这些动态部分的信息

    dynamicChildren 中即包含 children 中动态的部分，也包含 children 中的 Block，这样 Block 层层连接形成 Block Tree，在更新的时候只更新动态的那一部分

    ```ts {29-33,37-39,47-58,63-67,74}
    const patchElement = (
      n1: VNode,
      n2: VNode,
      parentComponent: ComponentInternalInstance | null,
      parentSuspense: SuspenseBoundary | null,
      isSVG: boolean,
      optimized: boolean
    ) => {
      const el = (n2.el = n1.el!)
      let { patchFlag, dynamicChildren, dirs } = n2
      // #1426 take the old vnode's patch flag into account since user may clone a
      // compiler-generated vnode, which de-opts to FULL_PROPS
      patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS
      const oldProps = n1.props || EMPTY_OBJ
      const newProps = n2.props || EMPTY_OBJ
      // ...

      if (patchFlag > 0) {
        // the presence of a patchFlag means this element's render code was
        // generated by the compiler and can take the fast path.
        // in this path old node and new node are guaranteed to have the same shape
        // (i.e. at the exact same position in the source template)
        if (patchFlag & PatchFlags.FULL_PROPS) {
          // element props contain dynamic keys, full diff needed
          patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG)
        } else {
          // class
          // this flag is matched when the element has dynamic class bindings.
          if (patchFlag & PatchFlags.CLASS) {
            if (oldProps.class !== newProps.class) {
              hostPatchProp(el, 'class', null, newProps.class, isSVG)
            }
          }

          // style
          // this flag is matched when the element has dynamic style bindings
          if (patchFlag & PatchFlags.STYLE) {
            hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
          }

          // props
          // This flag is matched when the element has dynamic prop/attr bindings
          // other than class and style. The keys of dynamic prop/attrs are saved for
          // faster iteration.
          // Note dynamic keys like :[foo]="bar" will cause this optimization to
          // bail out and go through a full diff because we need to unset the old key
          if (patchFlag & PatchFlags.PROPS) {
            // if the flag is present then dynamicProps must be non-null
            const propsToUpdate = n2.dynamicProps!
            for (let i = 0; i < propsToUpdate.length; i++) {
              const key = propsToUpdate[i]
              const prev = oldProps[key]
              const next = newProps[key]
              if (next !== prev || (hostForcePatchProp && hostForcePatchProp(el, key))) {
                hostPatchProp(el, key, prev, next, isSVG, n1.children as VNode[], parentComponent, parentSuspense, unmountChildren)
              }
            }
          }
        }

        // text
        // This flag is matched when the element has only dynamic text children.
        if (patchFlag & PatchFlags.TEXT) {
          if (n1.children !== n2.children) {
            hostSetElementText(el, n2.children as string)
          }
        }
      } else if (!optimized && dynamicChildren == null) {
        // unoptimized, full diff
        patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG)
      }

      if (dynamicChildren) {
        patchBlockChildren(n1.dynamicChildren!, dynamicChildren, el, parentComponent, parentSuspense)
      } else if (!optimized) {
        // full diff
        patchChildren(n1, n2, el, null, parentComponent, parentSuspense)
      }

      // ...
    }
    ```

2. **静态提升**

    以下是 [Vue 3 Template Explorer](https://vue-next-template-explorer.netlify.app/) 选上 hoistStatic 这个选项后编译出的代码

    ```html
    <div>
      <p>text</p>
    </div>
    ```

    ```js
    import { createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"

    const _hoisted_1 = /*#__PURE__*/_createVNode("p", null, "text", -1 /* HOISTED */)

    export function render(_ctx, _cache, $props, $setup, $data, $options) {
      return (_openBlock(), _createBlock("div", null, [
        _hoisted_1
      ]))
    }
    ```

    可以看到 `<p>text</p>` 生成的是 _hoisted_1 变量，在 render 作用域外面，这样每次 render 函数调用是就可以服用 _hoisted_1，减少 VNode 创建的性能消耗

3. 预字符串化

    ```html
    <div>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
      <p>text</p>
    </div>
    ```

    ```js
    import { createVNode as _createVNode, createStaticVNode as _createStaticVNode, openBlock as _openBlock, createBlock as _createBlock } from "vue"

    const _hoisted_1 = /*#__PURE__*/_createStaticVNode("<p>text</p><p>text</p><p>text</p><p>text</p><p>text</p><p>text</p><p>text</p><p>text</p><p>text</p><p>text</p>", 10)

    export function render(_ctx, _cache, $props, $setup, $data, $options) {
      return (_openBlock(), _createBlock("div", null, [
        _hoisted_1
      ]))
    }
    ```

    当有大量连续的静态的节点时，相比静态提升，预字符串化会进一步进行优化，通过字符串创建 Static VNode

    ```ts {16-20,30}
    const patch: PatchFn = (
      n1,
      n2,
      container,
      anchor = null,
      parentComponent = null,
      parentSuspense = null,
      isSVG = false,
      optimized = false
    ) => {
      // ...
      const { type, ref, shapeFlag } = n2
      switch (type) {
        // ...
        case Static:
          if (n1 == null) {
            mountStaticNode(n2, container, anchor, isSVG)
          } else if (__DEV__) {
            patchStaticNode(n1, n2, container, isSVG)
          }
          break
        // ...
      }
      // ...
    }

    const mountStaticNode = (n2: VNode, container: RendererElement, anchor: RendererNode | null, isSVG: boolean) => {
      // static nodes are only present when used with compiler-dom/runtime-dom
      // which guarantees presence of hostInsertStaticContent.
      ;[n2.el, n2.anchor] = hostInsertStaticContent!(n2.children as string, container, anchor, isSVG)
    }
    ```

    Static VNode 会在 patch 是直接插入到 container 中，生产环节下不进行更新

    预字符串化的好处有**生成代码的体积减少、减少创建 VNode 的开销、减少内存占用**

## 😃 ramble

Vue3 源码系列结束！

Vue3 目前写的只是它的响应式系统和运行时，还有很大的一个部分 complier，这一部分由于我对编译目前还没有太多的了解，而且对于理解 Vue3 核心原理影响并不大，所以就没有写，以后可能会写一写吧

之后就是 React 的源码了，至于我为什么热衷于看源码，不仅是因为自己的学习习惯，也是因为这些框架的源码相当于前端的“边界”，不仅代表着挑战也代表着我这一技术方向的深度

> [simple-vue 实现完整代码](https://github.com/ahabhgk/simple-vue3)
