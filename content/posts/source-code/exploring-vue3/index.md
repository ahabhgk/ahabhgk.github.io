---
title: Exploring Vue3.0
slug: /blogs/exploring-vue3
date: 2020-09-24
author: ahabhgk
description: exploring vue3
tags:
  - SourceCode
---

> **drafting**

接上一篇 [Vue Reactivity 响应式原理](https://ahabhgk.github.io/blogs/vue-reactivity-source-code)，一起探索 Vue3.0 的一些新特性

首先，我们会一起写一个简易的 runtime，对于 Vue 如何运行的有一个大致的了解，当然我们实现的会和源码本身有一些不同，会简化很多，主要学习思想。然后看一看其它周边特性的源码，简单了解

本篇文章并不是为了深入 Vue3 源码，而是对 Vue3 核心 VDOM 和新特性的简单了解，适合作为深入 Vue3 源码的**入门**文章

## Let's build a VDOM runtime

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

我们写简单一点，去掉 app 的创建，因为创建 app 其实类似于一个作用于，app 的插件和指令等只对该 app 下的组件起作用

```js:title=runtime-core/renderer.js
export function createRenderer(options) {

  return {
    render(rootVNode, container) {

    },
  }
}
```

通过 `createRenderer(nodeOps).render(<App />, document.querySelector('root'))` 调用，没错我就是抄 react 的，但是与 react 不同的在于 react 中调用 `<App />` 返回的是一个 ReactElement，这里我们直接返回 VNode，ReactElement 其实就是 `Partial<Fiber>`，react 中是通过 ReactElement 对 Fiber（VNode）进行 diff，我们直接 VNode 对比 VNode 也是可以的（实际上 Vue 和 Preact 都是这么做的）

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
    node: null, // 宿主环境的元素（dom node……）
    instance: null, // 组件实例
    parent: null, // parent VNode
    children: null, // VNode[]，建立内部 VNode 树结构
  }
}
```

Vue3 的 JSX 语法已经跟 React 很像了，除了 props.children 是通过 Slots 实现以外，基本都一样，这里我们并不打算实现 Slots，因为 Slots 实现的 children 也是一种 props，是一段 JSX 而已，并不算特殊，毕竟你随便写个 props 不叫 children 然后传 JSX 也是可以的

```js:title=runtime-core/renderer.js
export function createRenderer(options) {
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
export const isArray = Array.isArray
export const isText = (v) => typeof v === 'string' || typeof v === 'number'
```

```js:title=runtime-core/component.js
export const Text = Symbol('Text')
export const isTextType = (v) => v === Text
```

```js:title=runtime-core/vnode.js
// ...
export const isSameVNodeType = (n1, n2) => n1.type === n2.type && n1.key === n2.key
```

```js:title=runtime-core/renderer.js
import { isObject, isString, isArray, isText } from '../shared'
import { Text, isTextType } from './component'
import { isSameVNodeType, h } from './vnode'

export function createRenderer(options) {
  const patch = (n1, n2, container) => {
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    const { type } = n2
    if (isObject(type)) {
      processComponent(n1, n2, container)
    } else if (isString(type)) {
      processElement(n1, n2, container)
    } else if (isTextType(type)) {
      processText(n1, n2, container)
    } else {
      type.process(/* TODO */)
    }
  }

  // ...
}
```

patch（也就是 diff）在 type 判断最后加一个“后门”，我们可以用它来实现一些深度定制的组件（抄 preact 的），我们甚至可以实现一套 Preact Component……

diff 最主要的就是对于 Element 和 Text 的 diff，对应元素节点和文本节点，所以我们先实现这两个方法

```js:title=runtime-core/renderer.js
const processText = (n1, n2, container) => {
  if (n1 == null) {
    const node = n2.node = document.createTextNode(n2.props.nodeValue)
    container.appendChild(node)
  } else {
    const node = n2.node = n1.node
    node.nodeValue = n2.props.nodeValue
  }
}

const processElement = (n1, n2, container) => {
  if (n1 == null) {
    const node = n2.node = document.createElement(n2.type)
    patchChildren(null, n2, node)
    patchProps(null, n2.props, node)
    container.appendChild(node)
  } else {
    const node = n2.node = n1.node
    patchChildren(n1, n2, node)
    patchProps(n1.props, n2.props, node)
  }
}
```

可以看到对于 DOM 平台的操作是直接写上去的，并没有通过 options 传入，我们先这样耦合起来，后面再分离到 options 中

processText 的逻辑很简单，processElement 与 processText 类似，只不过多了 patchChildren 和 patchProps，patchProps 一看就知道是用来更新 props 的，很简单，patchChildren 就是对于两个 VNode 的子节点的 diff，它与 patch 的不同在于 patchChildren 可以处理子节点是 VNode 数组的情况，对于子节点**如何 patch** 做了处理（指 key diff），而 patch 就是简简单单对于两个 VNode 节点的 diff

所以对于 Element 的子节点会调用 patchChildren 处理，因为 Element 子节点可以是多个的，而对于 Component 的子节点会调用 patch 处理，因为 Component 子节点都仅有一个（Fragment 是有多个子节点的，对于它我们可以通过 compat 处理），当然 Component 的子节点也可以调用 patchChildren 处理，Preact 就是这样做的，这样 Preact 就不用对 Fragment 单独处理了（这里关键不在于怎样处理，而在于设计的 Component 子节点可不可以是多的，做对应处理即可）

接下来我们看一下 patchProps

```js:title=runtime-core/renderer.js {27,30,35}
const patchProps = (oldProps, newProps, node) => {
  oldProps = oldProps ?? {}
  newProps = newProps ?? {}
  // remove old props
  Object.keys(oldProps).forEach((propName) => {
    if (propName !== 'children' && propName !== 'key' && !(propName in newProps)) {
      options.setProperty(node, propName, null, oldProps[propName]);
    }
  });
  // update old props
  Object.keys(newProps).forEach((propName) => {
    if (propName !== 'children' && propName !== 'key' && oldProps[propName] !== newProps[propName]) {
      options.setProperty(node, propName, newProps[propName], oldProps[propName]);
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

接下来看 diff 算法的核心：patchChildren，我们先实现一个简易版的 key diff，后面会再次提到完整的 key diff，Vue3 的 key diff 也有比较亮眼的更新，后面会一起说

```js:title=runtime-core/renderer.js {18,24}
const patchChildren = (n1, n2, container) => {
  const oldChildren = n1 ? n1.children : [] // 拿到旧的 VNode[]
  let newChildren = n2.props.children // 新的 children
  newChildren = isArray(newChildren) ? newChildren : [newChildren]
  n2.children = [] // 新的 VNode[]

  for (let i = 0; i < newChildren.length; i++) {
    if (newChildren[i] == null) continue
    let newChild = newChildren[i]
    // 处理 Text，Text 也会建立 VNode，Text 不直接暴露给开发者，而是在内部处理
    newChild = isText(newChild) ? h(Text, { nodeValue: newChild }) : newChild
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

```js
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
