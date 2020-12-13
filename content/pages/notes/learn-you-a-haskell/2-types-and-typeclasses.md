---
title: Types and Typeclasses
slug: /note/learn-you-a-haskell/types-and-typeclasses
date: 2020-06-07
description: 《Haskell 趣学指南》读书笔记
tags:
  - Note
---

## Types

静态类型

类型推导

```haskell
> :t 'a'
'a' :: Char
> :t "hello"
"hello" :: [Char] ;; 表示 List
> :t True
True :: Bool
> :t (True, "a")
(True, "a") :: (Bool, [Char]) ;; 表示 Tuple
```

函数类型

```haskell
removeNonUppercase :: String -> String ;; String 等价于 [Char]
removeNonUppercase st = [ c | c <- st, c `elem` ['A' .. 'Z'] ]

addThree :: Int -> Int -> Int -> Int ;; 柯里化，参数之间用 -> 连接
addThree x y z = x + y + z
```

Int 有限，Integer 无限

```haskell
factorial Integer -> Integer
factorial n = product [1 .. n]
```

## Type variables

```haskell
> :t head
head :: [a] -> a
> :t fst
fst :: (a, b) -> a ;; a b 不一定是不同的类型
```

## Type classes

定义类型的行为，如果一个类型属于某个 Typeclass，那他必须实现该 Typeclass 所描述的行为

```haskell
> :t (==)
(==) :: Eq a => a -> a -> Bool
> :t (>)
(>) :: Ord a => a -> a -> Bool
```

Eq a 表示 a 这个 type var 必须属于 Eq 这个 typeclass，实现 Eq 的行为

- Eq：可判断相等性的类型，提供实现的函数是 == 和 /=

- Ord：可比较大小类型，< > <= >=

```haskell
> :t show
show :: Show a => a -> String
> :t read
read :: Read a => String -> a
> show True
"True"
> read "5" :: Int
5
```

- Show：可用字符串表示的类型

- Read：与 Show 相反

```haskell
> [LT .. GT]
[LT, EQ, GT]
```

- Enum：连续的类型

```haskell
> :t maxBound
maxBound :: Bounded a => a
> :t minBound
minBound :: Bounded a => a
> minBound :: Int
-9223372036854775808
> maxBound :: Int
9223372036854775807
```

- Bounded：有上下限

```haskell
> :t (+)
(+) :: Num a => a -> a -> a
> :t 20
20 :: Num p => p
> :t fromIntegral
fromIntegral :: (Integral a, Num b) => a -> b
> fromIntegral (length [1, 2, 3]) + 3.2
6.2
```

- Num：表示数字

- Integral：表示整数，包含 Int 和 Integer

- Floating：表示浮点，包含 Float 和 Double
