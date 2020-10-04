---
title: Let's build a Vue3 runtime
slug: /blogs/let-us-build-a-vue3-runtime
date: 2020-09-24
author: ahabhgk
description: Let's build a Vue3 runtime
tags:
  - SourceCode
  - Front End Framework
---

我们会一起写一个简易的 runtime，对于 Vue 如何运行的有一个大致的了解，当然我们实现的会和源码本身有一些不同，会简化很多，主要学习思想

本篇文章并不是为了深入 Vue3 源码，而是对 Vue3 核心 VDOM 和新特性的简单了解，适合作为深入 Vue3 源码的**入门**文章

## 👀 Vue3 Entry

我们先看一下 Vue3 的 JSX 组件怎么写，因为我们只是造一个 runtime，所以不会涉及到 Vue 的模版编译，直接用 JSX 就很方便

```jsx
import { createApp, ref } from 'vue';

const Displayer = {
  props: { count: Number },
  setup(props) {
    return () => <div>{props.count}</div>;
  },
};

const App = {
  setup(props) {
    const count = ref(0);
    const inc = () => count.value++;

    return () => (
      <div>
        <Displayer count={count.value} />
        <button onClick={inc}> + </button>
      </div>
    );
  },
};

createApp(App).mount('#app');
```

我们这里直接用的对象形式的组件，一般会使用 defineComponent，它做的只是多了处理传入一个函数的情况，返回一个有 setup 方法的对象，并没有更多其他的处理了，至于为什么设计出一个 `defineComponent` 方法而不直接写对象，大概是为了在 API 设计层面和 `defineAsyncComponent` 一致吧

先看入口 createApp，翻翻源码可以看出做的事是根据 rendererOptions 创建 renderer，然后创建 app 对象，最后调用 app.mount 进行渲染，mount 里也是调用的 render

我们写简单一点，去掉 app 的创建，因为创建 app 其实类似于一个作用域，app 的插件和指令等只对该 app 下的组件起作用

```js:title=runtime-core/renderer.js
export function createRenderer(renderOptions) {

  return {
    render(rootVNode, container) {

    },
  }
}
```

通过 `createRenderer(nodeOps).render(<App />, document.querySelector('root'))` 调用，没错我就是抄 React 的，但是与 React 不同的在于 React 中调用 `<App />` 返回的是一个 ReactElement，这里我们直接返回 VNode，ReactElement 其实就是 `Partial<Fiber>`，React 中是通过 ReactElement 对 Fiber（VNode）进行 diff，我们直接 VNode 对比 VNode 也是可以的（实际上 Vue 和 Preact 都是这么做的）

## 🌟 VNode Design

接下来我们来设计 VNode，因为 VNode 很大程度上决定了内部 runtime 如何去 diff

```js:title=runtime-core/vnode.js
export function h(type, props, ...children) {
  props = props ?? {}

  const key = props.key ?? null
  delete props.key

  // 注意 props.children 和 children 的不同
  // props.children 因为子组件会使用所以是没有处理过的
  // children 是为了维持内部的 VNode 树结构而创建的，类型是一个 VNode 数组
  if (children.length === 1) {
    props.children = children[0]
  } else if (children.length > 1) {
    props.children = children
  }

  return {
    type,
    props,
    key, // key diff 用的
    node: null, // 宿主环境的元素（dom node……），组件 VNode 为 null
    instance: null, // 组件实例，只有组件 VNode 会有，其他 VNode 为 null
    parent: null, // parent VNode
    children: null, // VNode[]，建立内部 VNode 树结构
  }
}
```

Vue3 的 JSX 语法已经跟 React 很像了，除了 props.children 是通过 Slots 实现以外，基本都一样，这里我们并不打算实现 Slots，因为 Slots 实现的 children 也是一种 props，是一段 JSX 而已，并不算特殊，毕竟你随便写个 props 不叫 children 然后传 JSX 也是可以的。Vue 专门弄一个 Slots 是为了兼容它的 template 语法

## ☄️ patchElement & patchText

```js:title=runtime-core/renderer.js
export function createRenderer(renderOptions) {
  return {
    render(vnode, container) {
      if (vnode == null) {
        if (container.vnode) {
          unmount(container.vnode)
        }
      } else {
        patch(container.vnode ?? null, vnode, container)
      }
      container.vnode = vnode
    },
  }
}
```

我们补全 render 方法的实现，这里不直接写 `patch(null, vnode, container)` 的原因是 render 有可能多次调用，并不一定每次调用都是 mount

```js:title=shared/index.js
export const isObject = (value) => typeof value === 'object' && value !== null
export const isString = (value) => typeof value === 'string'
export const isNumber = (value) => typeof value === 'number'
export const isText = (v) => isString(v) || isNumber(v)
export const isArray = Array.isArray
```

```js:title=runtime-core/component.js
import { isObject } from '../shared'

export const TextType = Symbol('TextType')
export const isTextType = (v) => v === TextType

export const isSetupComponent = (c) => isObject(c) && 'setup' in c
```

```js:title=runtime-core/vnode.js
// ...
export const isSameVNodeType = (n1, n2) => n1.type === n2.type && n1.key === n2.key
```

```js:title=runtime-core/renderer.js
import { isString, isArray, isText } from '../shared'
import { TextType, isTextType, isSetupComponent } from './component'
import { isSameVNodeType, h } from './vnode'

export function createRenderer(renderOptions) {
  const patch = (n1, n2, container) => {
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    const { type } = n2
    if (isSetupComponent(type)) {
      processComponent(n1, n2, container)
    } else if (isString(type)) {
      processElement(n1, n2, container)
    } else if (isTextType(type)) {
      processText(n1, n2, container)
    } else {
      type.patch(/* ... */)
    }
  }

  // ...
}
```

patch（也就是 diff）在 type 判断最后加一个“后门”，我们可以用它来实现一些深度定制的组件，比如 setupComponent 就可以放到这里实现，或者还可以实现 Hooks（抄 Preact 的，Preact Compat 很多实现都是拿到组件实例 this 去 hack this 上的一些方法，或者再拿内部的一些方法去处理，比如 diff、diffChildren……），这里我们甚至可以实现一套 Preact Component……

diff 最主要的就是对于 Element 和 Text 的 diff，对应元素节点和文本节点，所以我们先实现这两个方法

```js:title=runtime-core/renderer.js
const processText = (n1, n2, container) => {
  if (n1 == null) {
    const node = n2.node = document.createTextNode(n2.props.nodeValue)
    container.appendChild(node)
  } else {
    const node = n2.node = n1.node
    if (node.nodeValue !== n2.props.nodeValue) {
      node.nodeValue !== n2.props.nodeValue
    }
  }
}

const processElement = (n1, n2, container) => {
  if (n1 == null) {
    const node = n2.node = document.createElement(n2.type)
    mountChildren(n2, node)
    patchProps(null, n2.props, node)
    container.appendChild(node)
  } else {
    const node = n2.node = n1.node
    patchChildren(n1, n2, node)
    patchProps(n1.props, n2.props, node)
  }
}

const mountChildren = (vnode, container) => {
  let children = vnode.props.children
  children = isArray(children) ? children : [children]
  vnode.children = []
  for (let i = 0; i < children.length; i++) {
    let child = children[i]
    if (child == null) continue
    child = isText(child) ? h(TextType, { nodeValue: child }) : child
    vnode.children[i] = child
    patch(null, child, container)
  }
}
```

可以看到对于 DOM 平台的操作是直接写上去的，并没有通过 renderOptions 传入，我们先这样耦合起来，后面再分离到 renderOptions 中

processText 的逻辑很简单，processElement 与 processText 类似，只不过多了 patchChildren / mountChildren 和 patchProps

patchProps 一看就知道是用来更新 props 的

mountChildren 就是对子节点处理下 Text 然后一一 patch

patchChildren 就是对于两个 VNode 的子节点的 diff，它与 patch 的不同在于 patchChildren 可以处理子节点是 VNode 数组的情况，对于子节点**如何 patch** 做了处理（指 key diff），而 patch 就是简简单单对于两个 VNode 节点的 diff

所以对于 Element 的子节点会调用 patchChildren / mountChildren 处理，因为 Element 子节点可以是多个的，而对于 Component 的子节点会调用 patch 处理，因为 Component 子节点都仅有一个（Fragment 是有多个子节点的，对于它我们可以通过 compat 处理），当然 Component 的子节点也可以调用 patchChildren 处理，Preact 就是这样做的，这样 Preact 就不用对 Fragment 单独处理了（这里关键不在于怎样处理，而在于设计的 Component 子节点可不可以是多的，做对应处理即可）

接下来我们看一下 patchProps

```js:title=runtime-core/renderer.js {27,30,35}
const patchProps = (oldProps, newProps, node) => {
  oldProps = oldProps ?? {}
  newProps = newProps ?? {}
  // remove old props
  Object.keys(oldProps).forEach((propName) => {
    if (propName !== 'children' && propName !== 'key' && !(propName in newProps)) {
      setProperty(node, propName, null, oldProps[propName]);
    }
  });
  // update old props
  Object.keys(newProps).forEach((propName) => {
    if (propName !== 'children' && propName !== 'key' && oldProps[propName] !== newProps[propName]) {
      setProperty(node, propName, newProps[propName], oldProps[propName]);
    }
  });
}

const setProperty = (node, propName, newValue, oldValue) => {
  if (propName[0] === 'o' && propName[1] === 'n') {
    const eventType = propName.toLowerCase().slice(2);

    if (!node.listeners) node.listeners = {};
    node.listeners[eventType] = newValue;

    if (newValue) {
      if (!oldValue) {
        node.addEventListener(eventType, eventProxy);
      }
    } else {
      node.removeEventListener(eventType, eventProxy);
    }
  } else if (newValue !== oldValue) {
    if (propName in node) {
      node[propName] = newValue == null ? '' : newValue
    } else if (newValue == null || newValue === false) {
      node.removeAttribute(propName)
    } else {
      node.setAttribute(propName, newValue)
    }
  }
}

function eventProxy(e) {
  // this: dom node
  this.listeners[e.type](e)
}
```

值得注意的是第 35 行对于 `newValue === false` 的处理，是直接 removeAttribute 的，这是为了表单的一些属性。还有对于事件的监听，我们通过一个 eventProxy 代理，这样不仅方便移除事件监听，还减少了与 DOM 的通信，修改了事件监听方法直接修改代理即可，不至于与 DOM 通信移除旧的事件再添加新的事件

接下来看 diff 算法的核心：patchChildren，我们先实现一个简易版的 key diff，不考虑节点的移动，后面会有完整的 key diff

```js:title=runtime-core/renderer.js {18,24}
const patchChildren = (n1, n2, container) => {
  const oldChildren = n1.children // 拿到旧的 VNode[]
  let newChildren = n2.props.children // 新的 children
  newChildren = isArray(newChildren) ? newChildren : [newChildren]
  n2.children = [] // 新的 VNode[]

  for (let i = 0; i < newChildren.length; i++) {
    if (newChildren[i] == null) continue
    let newChild = newChildren[i]
    // 处理 Text，Text 也会建立 VNode，Text 不直接暴露给开发者，而是在内部处理
    newChild = isText(newChild) ? h(TextType, { nodeValue: newChild }) : newChild
    n2.children[i] = newChild
    newChild.parent = n2 // 与 n2.children 建立内部 VNode Tree

    let oldChild = null
    for (let j = 0; j < oldChildren.length; j++) { // key diff
      if (oldChildren[j] == null) continue
      if (isSameVNodeType(oldChildren[j], newChild)) { // 找到 key 和 type 一样的 VNode
        oldChild = oldChildren[j]
        oldChildren[j] = null // 找到的就变为 null，最后不是 null 的就是需要移除的，全部 unmount 即可
        break
      }
    }
    patch(oldChild, newChild, container)
    if (newChild.node) container.appendChild(newChild.node) // 有 node 就添加到 DOM 中，因为 component 没有 node
  }

  for (let oldChild of oldChildren) {
    if (oldChild != null) unmount(oldChild)
  }
}
```

我们并没有考虑移动节点的情况，而且是根据顺序 diff 的 newVNode，如果之前 node 在 container 中，appendChild 会先移除之前的 node，然后添加到末尾，所以是没问题的

```js:title=runtime-core/renderer.js
const unmount = (vnode) => {
  const child = vnode.node
  const parent = child.parentNode
  parent && parent.removeChild(child)
}
```

然后实现 unmount，因为目前只考虑 Element 和 Text 的 diff，unmount 就没有对 Component 的 unmount 进行处理，后面我们会加上，现在可以写个 demo 看看效果了

```jsx
/** @jsx h */
import { createRenderer, h } from '../../packages/runtime-core'

const renderer = createRenderer() // 这里我们还没有分离平台操作，可以先这样写
const $root = document.querySelector('#root')
const arr = [1, 2, 3]

setInterval(() => {
  arr.unshift(arr.pop())
  renderer.render(
    <div>
      {arr.map(e => <li key={e}>{e}</li>)}
    </div>,
    $root,
  )  
}, 300)
```

## 💥 patchComponent

下面实现 Component 的 patch

```js:title=runtime-core/renderer.js
const processComponent = (n1, n2, container) => {
  if (n1 == null) {
    const instance = n2.instance = {
      props: reactive(n2.props), // initProps
      render: null,
      update: null,
      subTree: null,
      vnode: n2,
    }
    const render = instance.render = n2.type.setup(instance.props)
    setupRenderEffect(instance, n2, container, anchor)

    function setupRenderEffect(instance, vnode, container, anchor) {
      instance.update = effect(() => { // component update 的入口，n2 是更新的根组件的 newVNode
        const renderResult = render()
        vnode.children = [renderResult]
        renderResult.parent = vnode
        patch(instance.subTree, renderResult, container, anchor)
        instance.subTree = renderResult
      })
    }
  } else {
    // update...
  }
}
```

首先是 mount Component，需要在 VNode 上建立一个组件实例，用来存一些组件的东西，props 需要 reactive 一下，后面写 update Component 的时候就知道为什么了，然后获取 setup 返回的 render 函数，这里非常巧妙的就是组件的 update 方法是一个 effect 函数，这样对应他的状态和 props 改变时就可以自动去更新

我们来看组件的 update

```js:title=runtime-core/renderer.js {10}
const processComponent = (n1, n2, container) => {
  if (n1 == null) {
    // mount...
  } else {
    const instance = n2.instance = n1.instance
    // updateProps, 根据 vnode.props 修改 instance.props
    Object.keys(n2.props).forEach(key => {
      const newValue = n2.props[key]
      const oldValue = instance.props[key]
      if (newValue !== oldValue) {
        instance.props[key] = newValue
      }
    })
  }
}
```

这里类似 `const node = n2.node = n1.node` 获取 instance，然后去 updateProps，这里就体现了之前 `reactive(props)` 的作用了，render 函数调用 JSX 得到的 props 每次都是新的，跟之前的 instance.props 并无关联，要是想 props 改变时也能使组件更新，就需要 JSX 的 props 和 instance.props 响应式的 props 进行关联，所以这里通过 updateProps 把 props 更新到 instance.props 上

我们再来看 updateProps，只涉及到了 instance.props 第一层的更新，相当于是做了层浅比较，内部实现了 React 的 PureComponent，阻断与更新无关子节点的更新，同时这里使用 shallowReactive 即可，得到更好一点的性能，但是之前我们没有实现 shallowReactive，这里就先用 reactive 替代

不要忘了我们的 unmount 还只能 unmount Element，我们来完善 Component 的 unmount

```js:title=runtime-core/renderer.js
const remove = (child) => {
  const parent = child.parentNode
  if (parent) parent.removeChild(child)
}

const unmount = (vnode, doRemove = true) => {
  const { type } = vnode
  if (isSetupComponent(type)) {
    vnode.children.forEach(c => unmount(c, doRemove))
  } else if (isString(type)) {
    vnode.children.forEach(c => unmount(c, false))
    if (doRemove) remove(vnode.node)
  } else if (isTextType(type)) {
    if (doRemove) remove(vnode.node)
  } else {
    type.unmount(/* ... */)
  }
}
```

类似于 patch，针对不同 type 进行 unmount，由于组件的 node 是 null，就直接将子节点进行 unmount

注意这里的 deRemove 参数的作用，Element 的子节点可以不直接从 DOM 上移除，直接将该 Element 移除即可，但是 Element 子节点中可能有 Component，所以还是需要递归调用 unmount，触发 Component 的清理副作用（后面讲）和生命周期，解决方案就是加一个 deRemove 参数，Element unmount 时 doRemove 为 true，之后子节点的 doRemove 为 false

最后还有清理副作用，生命周期就不提了，React 已经证明生命周期是可以不需要的，组件添加的 effect 在组件 unmount 后仍然存在，还没有清除，所以我们还需要在 unmount 中拿到组件所有的 effect，然后一一 stop，这时 stop 很简单，但如何拿到组件的 effect 就比较难

## 💫 Scheduler

其实 Vue 中并不会直接使用 Vue Reactivity 中的 API，从 Vue 中导出的 computed、watch、watchEffect 会把 effect 挂载到当前的组件实例上，用以之后清除 effect，我们只实现 computed 和简易的 watchEffect（不考虑 flush 为 post 和 pre 的情况）

> update 的 effect 在 Vue 中通过 scheduler 实现了异步更新，watchEffect 的回调函数执行时机 flush 也是通过 scheduler 实现，简单来说就是 scheduler 创建了三个队列，分别存 pre Callbacks、sync Callbacks 和 post Callbacks，这三个队列中任务的执行都是通过 promise.then 放到微任务队列中，都是异步执行的，组件的 update 放在 sync 队列中，sync 指的是同步 DOM 更新（Vue 中 VNode 更新和 DOM 更新是同步的），pre 指的是在 DOM 更新之前，post 指的是在 DOM 更新之后，所以 pre 得不到更新后的 DOM 信息，而 post 可以得到

```js:title=runtime-core/renderer.js {5,6}
const unmount = (vnode, doRemove = true) => {
  const { type } = vnode
  if (isSetupComponent(type)) {
    const instance = { vnode }
    instance.effects.forEach(stop)
    stop(instance.update)
    vnode.children.forEach(c => unmount(c, doRemove))
  } // ...
}
```

```js:title=runtime-core/component.js
let currentInstance
export const getCurrentInstance = () => currentInstance
export const setCurrentInstance = (instance) => currentInstance = instance

export const recordInstanceBoundEffect = (effect) => {
  if (currentInstance) currentInstance.effects.push(effect)
}
```

```js:title=reactivity/renderer.js {7,9-11}
const processComponent = (n1, n2, container) => {
  if (n1 == null) {
    const instance = n2.instance = {
      props: reactive(n2.props), // initProps
      render: null,
      update: null,
      subTree: null,
      vnode: n2,
      effects: [], // 用来存 setup 中调用 watchEffect 和 computed 的 effect
    }
    setCurrentInstance(instance)
    const render = instance.render = n2.type.setup(instance.props)
    setCurrentInstance(null)
    // update effect...
  } else {
    // update...
  }
}
```

组件的 setup 只会调用一次，所以在这里调用 setCurrentInstance 即可，这是与 React.FC 的主要区别之一

```js:title=reactivity/api-watch.js {6,11}
import { effect, stop } from '../reactivity'
import { recordInstanceBoundEffect, getCurrentInstance } from './component'

export const watchEffect = (cb, { onTrack, onTrigger } = {}) => {
  let cleanup
  const onInvalidate = (fn) => cleanup = e.options.onStop = fn
  const getter = () => {
    if (cleanup) {
      cleanup()
    }
    return cb(onInvalidate)
  }

  const e = effect(getter, {
    onTrack,
    onTrigger,
    // 这里我们写成 lazy 主要是为了 onInvalidate 正常运行
    // 不 lazy 的话 onInvalidate 会在 e 定义好之前运行，onInvalidate 中有使用了 e，就会报错
    lazy: true,
  })
  e()

  recordInstanceBoundEffect(e)
  const instance = getCurrentInstance()

  return () => {
    stop(e)
    if (instance) {
      const { effects } = instance
      const i = effects.indexOf(e)
      if (i > -1) effects.splice(i, 1) // 清除 effect 时也要把 instance 上的去掉
    }
  }
}
```

watchEffect 的回调函数还可以传入一个 onInvalidate 方法用于**注册**失效时的回调，执行时机是副作用即将重新执行时和侦听器被停止（如果在 setup() 中使用了 watchEffect, 则在卸载组件时），相当于 React.useEffect 返回的 cleanup 函数，至于为什么不设计成与 React.useEffect 一样返回 cleanup，是因为 watchEffect 被设计成支持参数传入异步函数的

```js {22-25}
const useLogger = () => {
  let id
  return {
    logger: (v, time = 2000) => new Promise(resolve => {
      id = setTimeout(() => {
        console.log(v)
        resolve()
      }, time)
    }),
    cancel: () => {
      clearTimeout(id)
      id = null
    },
  }
}

const App = {
  setup(props) {
    const count = ref(0)
    const { logger, cancel } = useLogger()

    watchEffect(async (onInvalidate) => {
      onInvalidate(cancel) // 异步调用之前就注册失效时的回调
      await logger(count.value)
    })

    return () => <button onClick={() => count.value++}>log</button>
  }
}
```

继续看 computed 怎么绑定 effect

```js:title=reactivity/api-computed.js
import { stop, computed as _computed } from '../reactivity'
import { recordInstanceBoundEffect } from './component'

export const computed = (options) => {
  const computedRef = _computed(options)
  recordInstanceBoundEffect(computedRef.effect) // computed 内部实现也用到了 effect 哦
  return computedRef
}
```

就是通过在 setup 调用时设置 currentInstance，然后把 setup 中的 effect 放到 currentInstance.effects 上，最后 unmount 时一一 stop

最后我们再实现组件和 watchEffect 的异步调用

```js:title=reactivity/scheduler.js
const resolvedPromise = Promise.resolve()
const queue = [] // 相对于 DOM 更新是同步的

export const queueJob = (job) => {
  queue.push(job)
  resolvedPromise.then(() => { // syncQueue 中的 callbacks 还是会加入到微任务中执行
    const deduped = [...new Set(queue)]
    queue.length = 0
    deduped.forEach(job => job())
  })
}
```

```js:title=reactivity/renderer.js {6}
const processComponent = (n1, n2, container) => {
  // createInstance, setup...
      instance.update = effect(() => {
        // patch...
      }, { scheduler: queueJob }) // 没有 lazy，mount 时没必要通过异步调用
  // ...
}
```

```js:title=reactivity/api-watch.js {3,6}
import { queueJob } from './scheduler'

const afterPaint = requestAnimationFrame
export const watchEffect = (cb, { onTrack, onTrigger } = {}) => {
  // onInvalidate...
  const scheduler = (job) => queueJob(() => afterPaint(job))
  const e = effect(getter, {
    lazy: true,
    onTrack,
    onTrigger,
    scheduler,
  })
  scheduler(e) // init run, run by scheduler (effect 的 lazy 为 false 时，即使有 scheduler 它的 init run 也不会通过 schduler 运行)
  // bind effect on instance, return cleanup...
}
```

> 这里 watchEffect 进入微任务中又加到 afterPaint 是模仿了 React.useEffect 的调用时机，源码中并不是这样的，源码中实现了 `flush: 'pre' | 'sync' | 'post'` 这三种模式，我们这里为了简单做了一些修改

其实就是创建一个队列，然后把更新和 watchEffect 的回调函数放到队列中，之后队列中的函数会通过 promise.then 放到微任务队列中去执行，实现异步更新

现在终于完成了！写一个 demo 看看效果～

```jsx
/** @jsx h */
import { ref } from '../../packages/reactivity'
import { h, createRenderer, watchEffect } from '../../packages/runtime-core'

const Displayer = {
  setup(props) {
    return () => (
      <div>{props.children}</div>
    )
  }
}

const App = {
  setup(props) {
    const count = ref(0)
    const inc = () => count.value++

    watchEffect(() => console.log(count.value))

    return () => (
      <div>
        <button onClick={inc}> + </button>
        {count.value % 2 ? <Displayer>{count.value}</Displayer> : null}
      </div>
    )
  }
}

createRenderer().render(<App />, document.querySelector('#root'))
```

## ⚡️ key diff

这里我们只给出简单版的实现（React 使用的 key diff，相比 Vue 使用的少了些优化，但是简单易懂），具体讲解可以看这篇[渲染器的核心 Diff 算法](http://hcysun.me/vue-design/zh/renderer-diff.html)，是一位 Vue Team Member 写的，应该没有文章讲的比这篇更清晰易懂了

```js:title=runtime-core/renderer.js {7,15,21,25-32,36-42}
const patchChildren = (n1, n2, container) => {
  const oldChildren = n1.children
  let newChildren = n2.props.children
  newChildren = isArray(newChildren) ? newChildren : [newChildren]
  n2.children = []

  let lastIndex = 0 // 存上一次 j 的值
  for (let i = 0; i < newChildren.length; i++) {
    if (newChildren[i] == null) continue
    let newChild = newChildren[i]
    newChild = isText(newChild) ? h(TextType, { nodeValue: newChild }) : newChild
    n2.children[i] = newChild
    newChild.parent = n2

    let find = false
    for (let j = 0; j < oldChildren.length; j++) {
      if (oldChildren[j] == null) continue
      if (isSameVNodeType(oldChildren[j], newChild)) { // update
        const oldChild = oldChildren[j]
        oldChildren[j] = null
        find = true

        patch(oldChild, newChild, container)

        if (j < lastIndex) { // j 在上一次 j 之前，需要移动
          // 1. 目前组件的 VNode.node 为 null，后面我们会 fix
          // 2. newChildren[i - 1] 因为在上一轮已经 patch 过了，所以 node 不为 null
          const refNode = getNextSibling(newChildren[i - 1])
          move(oldChild, container, refNode)
        } else { // no need to move
          lastIndex = j
        }
        break
      }
    }
    // mount
    if (!find) {
      const refNode = i - 1 < 0
        ? getNode(oldChildren[0])
        : getNextSibling(newChildren[i - 1])
      patch(null, newChild, container, refNode)
    }
  }

  for (let oldChild of oldChildren) {
    if (oldChild != null) unmount(oldChild)
  }
}
```

之前是不涉及节点移动的，不管有没有节点一律 appendChild，现在需要加上节点移动的情况，就需要处理没有节点时新添加节点的 mount，对于移动的节点需要找到要移动到的位置（refNode 前面）

现在 mount 新节点时进行插入需要向 patch 传入 refNode，需要相应的更改之前的 patch，同时取 refNode 和 move 时会根据 type 不同操作也不同，我们这里将这几个操作进行封装

> 现在根据 type 不同封装出的操作有这些，patch 用来进入 VNode 更新，getNode 用于插入新 VNode 时取 oldChildren[0] 的 node，getNextSibling 用于取移动 VNode 时取 nextSibling，move 用来移动节点，unmount 用来移除 VNode，这些操作都是在该 diff 算法下会根据 type 不同有不同操作的一个封装，此外再算上 mountChildren、patchChildren 和 renderOptions，作为 internals 传入 type 的这五个方法中（剩余的方法可以通过以上方法调用到，所以不用暴露出去），用于深度定制组件，下一篇会详细讲 Vue3 Compat，表示 Vue3 中周边组件和一些其他新特性的实现原理，作为本篇的补充

```js:title=runtime-core/renderer.js {1,22-23,28,36,45}
const patch = (n1, n2, container, anchor = null) => { // insertBefore(node, null) 就相当于 appendChild(node)
  // unmount...

  const { type } = n2
  if (isSetupComponent(type)) {
    processComponent(n1, n2, container, anchor)
  } else if (isString(type)) {
    processElement(n1, n2, container, anchor)
  } else if (isTextType(type)) {
    processText(n1, n2, container, anchor)
  } else {
    type.patch(/* ... */)
  }
}

const getNode = (vnode) => { // patchChildren 在插入新 VNode 时调用 getNode(oldChildren[0])
  if (!vnode) return null // oldChildren[0] 为 null 是返回 null 相当于 appendChild
  const { type } = vnode
  if (isSetupComponent(type)) return getNode(vnode.instance.subTree)
  if (isString(type) || isTextType(type)) return vnode.node
  return type.getNode(internals, { vnode })
}

const getNextSibling = (vnode) => { // patchChildren 在进行移动 VNode 前获得 refNode 调用
  const { type } = vnode
  if (isSetupComponent(type)) return getNextSibling(vnode.instance.subTree)
  if (isString(type) || isTextType(type)) return hostNextSibling(vnode.node)
  return type.getNextSibling(internals, { vnode })
}

const move = (vnode, container, anchor) => { // patchChildren 中用于移动 VNode
  const { type } = vnode
  if (isSetupComponent(type)) {
    move(vnode.instance.subTree, container, anchor)
  } else if (isString(type) || isTextType(type)) {
    hostInsert(vnode.node, container, anchor)
  } else {
    type.move(internals, { vnode, container, anchor })
  }
}

const processComponent = (n1, n2, container, anchor) => {
  if (n1 == null) {
    // ...
        patch(instance.subTree, renderResult, container, anchor)
    // ...
  } else {
    // ...
  }
}

const processElement = (n1, n2, container, anchor) => {
  if (n1 == null) {
    // ...
    container.insertBefore(node, anchor)
  } else {
    // ...
  }
}

const processText = (n1, n2, container, anchor) => {
  if (n1 == null) {
    // ...
    container.insertBefore(node, anchor)
  } else {
    // ...
  }
}

const mountChildren = (vnode, container, isSVG, anchor) => {
  // ...
  for (/* ... */) {
    // ...
    patch(null, child, container, isSVG, anchor)
  }
}
```

## 🎨 Renderer

现在我们的 runtime 基本完成了，之前为了写起来方便并没有抽离出来平台操作，现在我们抽离出来，然后把原来的从传入的 renderOptions 引入即可

```js:title=runtime-dom/index.js
import { createRenderer, h } from '../runtime-core'

const nodeOps = {
  querySelector: (sel) => document.querySelector(sel),

  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor ?? null)
  },

  remove: child => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },

  createElement: (tag) => document.createElement(tag),

  createText: text => document.createTextNode(text),

  nextSibling: node => node.nextSibling,

  setProperty: (node, propName, newValue, oldValue) => {
    if (propName[0] === 'o' && propName[1] === 'n') {
      const eventType = propName.toLowerCase().slice(2);
  
      if (!node.listeners) node.listeners = {};
      node.listeners[eventType] = newValue;
  
      if (newValue) {
        if (!oldValue) {
          node.addEventListener(eventType, eventProxy);
        }
      } else {
        node.removeEventListener(eventType, eventProxy);
      }
    } else if (newValue !== oldValue) {
      if (propName in node) {
        node[propName] = newValue == null ? '' : newValue
      } else if (newValue == null || newValue === false) {
        node.removeAttribute(propName)
      } else {
        node.setAttribute(propName, newValue)
      }
    }
  },
}

function eventProxy(e) {
  // this: node
  this.listeners[e.type](e)
}

export const createApp = (rootComponent) => ({
  mount: (rootSel) =>
    createRenderer(nodeOps).render(h(rootComponent), nodeOps.querySelector(rootSel))
})
```

```js:title=runtime-core/renderer.js
export function createRenderer(renderOptions) {
  const {
    createText: hostCreateText,
    createElement: hostCreateElement,
    insert: hostInsert,
    nextSibling: hostNextSibling,
    setProperty: hostSetProperty,
    remove: hostRemove,
  } = renderOptions
  // ...
}
```

## 😃 ramble

1. 之前 Vue2 的时候一直对 Vue 不太感兴趣，觉得没 React 精简好用，而且那时候 React 已经有 Hooks 了，后来 Vue Reactivity 和 Composition API 出现后，同时越发觉得 Hooks 有很重的心智负担，才逐渐想去深入了解 Vue，从之前写 Reactivity 解析到现在写 runtime，发现 Vue3 的心智负担并没有想象中的那么少，但还是抵挡不住它的简单好用

2. 对 Vue 的越来越深入也让我越发觉得 Vue 和 React 很多地方是一样的，也发现了它们核心部分的不同，Vue 就是 Proxy 实现的响应式 + VDOM runtime + 模版 complier，React 因为是一遍一遍的刷新，所以是偏向函数式的 Hooks + VDOM runtime (Fiber) + Scheduler，所以总结来说一个前端框架的核心就是数据层（reactivity、hooks、ng service）和视图连接层（VDOM、complier）

3. 没有处理 svg，但是也很简单，这篇写的时候改了很多次，感觉已经写的很复杂了，所以在有的地方做了简化，更完整的可以看这个仓库

> [simple-vue/runtime-core 实现完整代码](https://github.com/ahabhgk/simple-vue3/tree/master/packages/runtime-core)
