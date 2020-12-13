---
title: 编译原理之美
slug: /note/compliers/the-beauty-of-complier
date: 2020-12-11
description: the-beauty-of-complier
tags:
  - Note
---

## 实现脚本语言

- 词法分析：把程序分割成一个个 Token 的过程，可以通过构造有限自动机来实现
- 语法分析：把程序的结构识别出来，并形成一棵便于由计算机处理的抽象语法树。可以用递归下降的算法来实现
- 语义分析：消除语义模糊，生成一些属性信息，让计算机能够依据这些信息生成目标代码
