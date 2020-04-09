---
title: 读《7 周 7 语言》- Haskell
slug: notes-of-7-languages-in-7-weeks-haskell
date: 2020-04-11
description: 《7 周 7 语言》读书笔记
tags:
  - Note
  - 7 Languages in 7 Weeks
---

> 纯函数式
>
> 惰性处理
>
> 强类型静态类型
>
> 不会产生副作用，可以返回一个副作用并被延迟执行

安装使用 stack，然后换成清华源，IDE 用 VSCode + HIE

```haskell
0.1 + 0.2
-- 0.30000000000000004
4 * (2.0 + 1)
-- 12
"hello" ++ " world"
-- "hello world"
['a', 'b']
-- "ab"
if 5 == 5 then "true" else "false"
-- "true"
if (1) then "true" else "false"
-- error 强类型
"one" + 1
-- error

:set +t -- 打开 t 查看类型
4
-- 4
-- it :: Num p => p
:t 4 -- :t 查看类型
-- it :: Num p => p
```

函数

```haskell
module Throwaway where

double x = x * 2 -- 自动类型推断 double :: Num a => a -> a
-- a 是一个类型变量，通过传入参数推断出类型 a，之后返回也是 a 类型
```

```haskell
module Throwaway where

double :: Integer -> Integer
double x = x * 2 -- double 2.0 -- error
```

递归

```haskell
let fact x = if x == 0 then 1 else fact (x - 1) * x -- fact :: (Eq p, Num p) => p -> p
```

模式匹配

```haskell
factorial :: Integer -> Integer
factorial 0 = 1
factorial x = x * factorial (x - 1)
```

哨兵表达式

```haskell
factorial :: Integer -> Integer
factorial x
  | x > 1 = x * factorial (x - 1)
  | otherwise = 1
```

元组

```haskell
fibTuple :: (Integer, Integer, Integer) -> (Integer, Integer, Integer)
fibTuple (x, y, 0) = (x, y, 0)
fibTuple (x, y, index) = fibTuple (y, x + y, index - 1)

fibResult :: (Integer, Integer, Integer) -> Integer
fibResult (x, y, z) = x

fib :: Integer -> Integer
fib x = fibResult (fibTuple (0, 1, x))
```

元组和组合

```haskell
let second list = head (tail list) -- let 是局部定义
let second = head . tail -- compose 简写
```

```haskell
fibNextPair :: (Integer, Integer) -> (Integer, Integer)
fibNextPair (x, y) = (y, x + y)

fibNthPair :: Integer -> (Integer, Integer)
fibNthPair 1 = (1, 1)
fibNthPair n = fibNextPair (fibNthPair (n - 1))

fib :: Integer -> Integer
fib = fst . fibNthPair -- fib n = fst (fibNthPair n)
```

```haskell
let h:t = [1, 2, 3, 4] -- h = 1, t = [2, 3, 4]

size [] = 0
size (h:t) = 1 + size t
-- size "hello world" -> 11

prod [] = 1
prod (h:t) = h * prod t

-- zip ['a', 'c'] ['b', 'd'] -> [('a', 'b'), ('c', 'd')]
```

生成列表

```haskell
1:[2, 3] -- [1, 2, 3]
[1]:[2, 3] -- error
[1]:[[2], [3, 4]] -- [[1], [2], [3, 4]]

allEven :: [Integer] -> [Integer]
allEven [] = []
allEven (h:t) = if even h then h:allEven t else allEven t
-- allEven [1, 2, 3] -> [2]
```

```haskell
[1 .. 2] -- [1, 2]
[1 .. 4] -- [1, 2, 3, 4]
[10, 4] -- []
[10, 9.5 .. 4] -- [10.0, 9.5, 9.0, 8.5, 8.0, 7.5, 7.0, 6.5, 6.0, 5.5, 5.0, 4.5, 4.0]

take 5 [1 .. ] -- [1, 2, 3, 4, 5]
take 5 [0, 3 .. ] -- [0, 3, 6, 9, 12]
```

```haskell
[x * 2 | x <- [1, 2, 3]] -- [2, 4, 6]
[(y, x) | (x, y) <- [(1, 2), (2, 3)]] -- [(2, 1), (3, 2)]

let crew = ["Lj", "Hgk"]
[(a, b) | a <- crew, b <- crew, a /= b]
-- [("Lj","Hgk"),("Hgk","Lj")]
```

// TODO
