> **drafting**

### StaticNode 优化实现

从 patch 进入，匹配 type 为 Static 时处理

```ts:title=runtime-core/src/renderer.ts
if (n1 == null) {
  mountStaticNode(n2, container, anchor, isSVG)
} else if (__DEV__) {
  patchStaticNode(n1, n2, container, isSVG)
}
```

mountStaticNode 最终调用 nodeOps.insertStaticContent 插入 dom，nodeOps 是 renderer 对应平台的操作

TODO(check): 可以看到 StaticNode 是只针对 dom 平台的，因为这里使用了 innerHTML

```ts:title=runtime-dom/src/nodeOps.ts
// __UNSAFE__
// Reason: innerHTML.
// Static content here can only come from compiled templates.
// As long as the user only uses trusted templates, this is safe.
insertStaticContent(content, parent, anchor, isSVG) {
  const temp = isSVG
    ? tempSVGContainer ||
      (tempSVGContainer = doc.createElementNS(svgNS, 'svg'))
    : tempContainer || (tempContainer = doc.createElement('div'))
  temp.innerHTML = content
  const first = temp.firstChild as Element
  let node: Element | null = first
  let last: Element = node
  while (node) {
    last = node
    nodeOps.insert(node, parent, anchor)
    node = temp.firstChild as Element
  }
  return [first, last]
}
```

最后返回的 first 和 last 就对应 n2.el 和 n2.anchor，后面 update 阶段就直接把这两个赋给新 vnode（n2）跳过更新

```ts:title=runtime-core/src/renderer.ts
const patchStaticNode = (
  n1: VNode,
  n2: VNode,
  container: RendererElement,
  isSVG: boolean
) => {
  // static nodes are only patched during dev for HMR
  if (n2.children !== n1.children) {
    const anchor = hostNextSibling(n1.anchor!)
    // remove existing
    removeStaticNode(n1)
    // insert new
    ;[n2.el, n2.anchor] = hostInsertStaticContent!(
      n2.children as string,
      container,
      anchor,
      isSVG
    )
  } else {
    n2.el = n1.el
    n2.anchor = n1.anchor
  }
}
```
