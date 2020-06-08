---
title: 从零开始
slug: /notes/learn-you-a-haskell/start
date: 2020-06-01
description: 《Haskell 趣学指南》读书笔记
tags:
  - Note
---

```haskell
> 5 / 2
2.5
> True && False
False
> False || True
True
> not (True && True)
False
> 5 == 5
True
> 5 /= 5
False
> "Hello" == "Hello"
True
> 5 == "Hello" ;; Error 不同类型
> 5 + 4.0
9.0 ;; 5 既可以看作整形也可以看作浮点数，4.0 只能看做浮点数
```

`5 / 2` 中的 `/` 称为中缀函数

```haskell
> succ 9 + max 5 4 + 1 ;; succ 返回一个数的后继
16 ;; 函数有最高的调用优先级，相当于 (succ 9) + (max 5 4) + 1
```

`bar (bar 3)` 不表示 bar 和 3 作为 bar 的两个参数，表示 `bar 3` 的结果作为 bar 的参数

```haskell
> doubleSmallNumber x = if x > 100 then x else x * 2
```

if 语句是个表达式，必须有返回结果

```haskell
> [1, 2, 3, 4] ++ [5, 6, 7, 8]
[1, 2, 3, 4, 5, 6, 7, 8]
> "Hello" ++ " " ++ "World"
"Hello World"
> ['H', 'e', 'l', 'l', 'o'] ++ [' '] ++ ['W', 'o', 'r', 'l', 'd']
"Hello World"
```

List 内部类型必须相同，不关心数量，`++` 用来连接两个 List，字符串是字符列表的语法糖

```haskell
> 'A' : " SMALL CAT"
"A SMALL CAT"
> 1 : [2, 3, 4]
[1, 2, 3, 4]
> "Cat" !! 1
'a'
> [1, 2, 3] !! 0
1
```

`:` 用来添加到 List 前端，`!!` 用来通过下标取数，`[1, 2, 3]` 是 `1:2:3:[]` 的语法糖

```haskell
> [[1, 2], []]
[[1, 2], []]
```

List 中的 List 可以是不同长度的，但内部元素必须同类型

```haskell
> [3, 2, 1] > [2, 3, 4]
True
> [3, 4, 2] > [3, 4]
True
> [2, 3, 4] == [2, 3, 4]
```

List 的比较根据下标依次比较

List 中的各种操作：

```haskell
> head [1, 2, 3, 4]
1
> tail [1, 2, 3, 4]
[2, 3, 4]
> last [1, 2, 3, 4]
4
> init [1, 2, 3, 4]
[1, 2, 3]
> head [] ;; Error head、tail、last、init 都要小心空 List
> length [1, 2, 3]
3
> null [1, 2, 3]
False
> null []
True
> reverse [1, 2, 3]
[3, 2, 1]
> take 2 [1, 2, 3]
[1, 2]
> drop 2 [1, 2, 3]
[3]
> maximum [1, 2, 3]
3
> minimum [1, 2, 3]
1
> sum [1, 2, 3]
6
> product [1, 2, 3, 4]
24
> 4 `elem` [1, 2, 3, 4]
True
> 0 `elem` [1, 2, 3, 4]
False
```

Range

```haskell
> [2, 4 .. 10]
[2, 4, 6, 8, 10]
> [0.1, 0.3 .. 1]
[0.1, 0.3, 0.5, 0.7, 0.8999999999999999, 1.0999999999999999] ;; 要避免小数 Range
> take 24 [13, 26 ..] ;; Haskell 是惰性的，它不会对无限长度的 List 求值
> take 10 (cycle [1, 2, 3])
[1, 2, 3, 1, 2, 3, 1, 2, 3, 1]
> take 5 (repeat 1)
[1, 1, 1, 1, 1]
> replicate 3 10
[10, 10, 10]
```

List Comprehension

```haskell
> [ x * 2 | x <- [1..5] ]
[2, 4, 6, 8, 10]
> boomBangs xs = [ if x < 10 then "BOOM!" else "BANG!" | x <- xs, odd x]
> boomBangs [7..13]
["BOOM!","BOOM!","BANG!","BANG!"]
> [ x * y | x <- [2, 5, 10], y <- [8, 10, 11] ]
[16,20,22,40,50,55,80,100,110]
> length xs = sum [ 1 | _ <- xs ]
> evenList = [ [ x | x <- xs, even x ] | xs <- xxs ]
> evenList [[1, 3, 5, 2, 4], [6, 8, 9, 5]]
[[2, 4], [6, 8]]
```

Tuple 数量明确，不关心类型

```haskell
> [(1, "two"), (3, "four")]
[(1, "two"), (3, "four")] ;; Tuple 也可以储存 List
> [(1, 2), (3, 4, 5)] ;; Error 数量不同
> [(1, "two"), (3, 4)]
```

```haskell
> fst ("Wow", False)
"Wow"
> snd ("Wow", True)
True
```

fst snd 只对 Pair Tuple 有效

```haskell
> :t zip
zip :: [a] -> [b] -> [(a, b)]
> zip [1 .. 5] ["one", "two", "three", "four", "five"]
[(1,"one"),(2,"two"),(3,"three"),(4,"four"),(5,"five")]
```

```haskell
> let rightTriangles = [ (a, b, c) | c <- [1..10], b <- [1..c], a <- [1..b], a ^ 2 + b ^ 2 == c ^ 2 ]
> rightTriangles
[(3,4,5),(6,8,10)]
```
## Sum

- `not`：非

- `/=`：不等

- `++`： List 拼接

- `'a':"bc"`：List 加入头部

- `[1, 2, 3] !! 0`：取下标

- `head tail last init take drop`：List 截取操作，小心空数组

- `length`：取 List Length

- `null`：判断 List 是否为空

- `reverse`：List 逆序

- `minimum maximum`：List 最大最小

- `sum product`：List 求和求积

- 1 \`elem\` [1, 2, 3]：判断 List 是否存在该元素

- `[2, 4..10]`：Range

- `[ x * 2 | x <- [1..5] ]`：List Comprehension

- `(True, 1)`：Tuple
