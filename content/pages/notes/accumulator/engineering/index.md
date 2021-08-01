---
title: Engineering
slug: /note/accumulator/engineering
date: 2021-07-20
description: Engineering
tags:
  - Note
---

## babel

### 6to5

- `@babel/preset-env`：主要转换 syntax（`const`、`let`、`class`、`...`），可选转换 API（`includes`、`Promise`、`flat`）
    - targets：browserslist 或各个浏览器的版本，适配的环境
    - useBuiltins：决定 preset-env 如何处理 polyfills，`usage` 根据使用情况和 targets 注入，`entry` 入口手动引入 core-js、regenerator-runtime，babel 根据 targets 把使用到的全部引入
    - corejs：控制 core-js 版本，是否开启 proposal

```js
// babel options
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "chrome": "58" // 按自己需要填写
        },
        "useBuiltIns": "entry",
        "corejs": {
          "version": 3,
          "proposals": true
        }
      }
    ]
  ],
  "plugins": []
}

// 入口文件代码
import 'core-js/stable';
import 'regenerator-runtime/runtime';
```

问题：1. 引入的 polyfill 有些 helpers 模块冗余 2. 业务上 polyfill 可以污染全局，但 lib 不行

- `@babel/plugin-transform-runtime`：polyfill helpers 模块从 `@babel/runtime/helpers` 引入，解决了冗余问题，polyfill 也不污染全局
    - Regenerator aliasing（options.regenerator 可关闭）
    - core-js aliasing（options.corejs 可关闭）
    - Helper aliasing（options.helpers 可关闭）

业务中：

```js
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "chrome": 58 // targets 按浏览器版本引入 polyfill
        },
        "useBuiltIns": "usage",
        "corejs": {
          "version": 3,
          "proposals": true
        }
      }
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime",
      {
        "corejs": false // 关闭 transform-runtime 的 corejs，由 preset-env 引入，享受 targets 按浏览器版本引入 polyfill
      }
    ]
  ]
}
```

lib 上：

```js
{
  "presets": [
    [
      "@babel/preset-env", // useBuiltIns 默认为 false，用 transform-runtime 的 corejs
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-transform-runtime", // 无法享受 targets，用到的全转换
      {
        "corejs": {
          "version": 3,
          "proposals": true
        }
      }
    ]
  ]
}
```

由于 targets 在 preset-env 指定，transform-runtime 是一个独立的插件，获取不到 targets，所以用 transform-runtime 享受不污染全局和 helpers 不冗余包体见效的好处时，就无法享受 preset-env 中 targets 按浏览器版本引入 polyfill 以减小包体的好处

于是 babel 在 7.13.0 中将 targets 提到了顶层，所有插件都可以获取 targets，所以 7.13.0 中就可以同时使用 targets 和 transform-runtime 了，相关 [issue](https://github.com/babel/babel/pull/11572#issuecomment-785499971)，issue 中提到的 `babel-plugin-polyfill-corejs3` 来自 [babel/babel-polyfills](https://github.com/babel/babel-polyfills)，在做 babel 的[下一代 polyfill 方案](https://github.com/babel/babel/issues/10008)
