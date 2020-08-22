---
title: Programming Language
slug: /notes/programming-language/part-a
date: 2020-08-20
description: 《Programming Language》MOOC 笔记
tags:
  - Note
---

## Unit 1: ML Functions, Tuples, Lists, and More

```sml
(* Let's SML! *)

val x = 1;
(* static env: x: int *)
(* dynamic env: x -> 1 *)

val y = 2;
(* static env: x: int, y: int *)
(* dynamic env: x -> 1, y -> 2 *)

val z = (x + 1) * (y + 2);
(* static env: x: int, y: int, z: int *)
(* dynamic env: x -> 1, y -> 2, z -> 8 *)

val abs_z = if z < 0 then 0 - z else z; (* bool *) (* int *)
(* static env: ..., abs_z: int *)
(* dynamic env: ..., abs_z: 8 *)

val abs_z_simpler = abs z;
```

Semantics

- Syntax is just how you write something
- Semantics is what that something means
  - Type-checking (before program runs)
  - Evaluation (as program runs)
- For variable bindings:
  - Type-check expression and extend static environment
  - Evaluate expression and extend dynamic environment

Expression

- Syntax
- Type-checking rules
  - Produces a type or fails (with a bad error message)
  - Types so far: int bool unit
- Evaluation rules (used only on things that type-check)
  - Produces a value (or exception or infinite-loop)

Variables

- Syntax:
  - sequence of letters, digits, _, not starting with digit
- Type-checking:
  - Look up type in current static environment
  - If not there fail
- Evaluation:
  - Look up value in current dynamic environment

Less-than

- Syntax:
  - e1 + e2 where e1 and e2 are expressions
- Type-checking:
  - If e1 and e2 have type int, then e1 + e2 has type int
- Evaluation:
  - If e1 evaluates to v1 and e2 evaluates to v2, then e1 + e2 evaluates to sum of v1 and v2

Conditional

- Syntax:
  - if e1 then e2 else e3. e1, e2 and e3 are expressions
- Type-checking:
  - e1 must have type bool, e2 and e3 have type T, the type of entire expression is also T
- Evaluation:
  - evaluate e1 to a value call it v1, if v1 is true, then evaluate e2 and that result is the whole expression's result, else evaluate e3 and that result is the whole exporession's result

```sml
val x = 0 - 5
val y = ~5
y = x (* true *)

2.0 / 1.0 (* 2.0: real *)
2 div 1 (* 2: int *)
```

Function

```sml
fun pow(x : int, y : int) =
  if y = 0
  then 1
  else x * pow(x, y - 1)
(* val pow = fn : int * int -> int *)

fun cube(x) =
  pow(x, 3)
(* val cube = fn : int -> int *)

val x = pow(3, 4)
val y = cube(3)
```

Pair

```sml
fun swap(pr : int * bool) =
  (#2 pr, #1 pr)
(* val swap = fn : int * bool -> bool * int *)

fun sum_two_pairs(pr1: int * int, pr2 : int * int) =
  (#1 pr1) + (#2 pr1) + (#1 pr2) + (#2 pr2)
(* val sum_two_pair = fn : (int * int) * (int * int) -> int *)

fun div_mod(x : int, y : int) =
  (x div y, x mod y)
(* val div_mod = fn : int * int -> int * int *)

fun sort_pair(pr : int * int) =
  if (#1 pr) < (#2 pr)
  then pr
  else (#2 pr, #1 pr)
```

Tuples: fixed "number of pieces" that may have different types

```sml
val x = (7, (true, 9), (1, 2, 3)) (* int * (bool * int) * (int * int * int) *)
val y = #1 (#2 x) (* bool *)
val z = #3 x (* int * int * int *)
```

Lists: have any number of elements, all list elements have the same type

- `null e` evaluates to true if and only if e evaluates to []
- if e evaluates to `[v1, v2, ..., vn]` then `hd e` evaluates to `v1` (raise exception if e evaluates to `[]`)
- if e evaluates to `[v1, v2, ..., vn]` then `tl e` evaluates to `[v2, ..., vn]` (raise exception if e evaluates to `[]`)

```sml
[] (* 'a list (type a list) *)
[1, 2, 3] (* int list *)
[true, false, false] (* bool list *)

true::[] (* bool list *)
5::[6, 7] (* [5, 6, 7] int list *)
[1]::[[2, 3], [4, 5]] (* int list list *)

(* val null = fn : 'a list -> bool *)
null [1, 2] (* false *)
null [] (* true *)

(* val hd = fn : 'a list -> 'a *)
hd (tl [1, 2, 3]) (* 2 *)

(* val hd = fn : 'a list -> 'a list *)
tl (tl (tl [1, 2, 3])) (* [] *)
tl (tl (tl (tl [1, 2, 3]))) (* error! *)
```

```sml
fun append (xs, ys) =
  if null xs
  then ys
  else (hd xs) :: append ((tl xs), ys)

fun map (f, xs) =
  if null xs
  then []
  else (f (hd xs)) :: (map (f, (tl xs)))

fun firsts2 (xs : (int * int) list) =
  map (fn (x) => (#1 x), xs)

fun seconds2 (xs : (int * int) list) =
  map (fn (x) => (#2 x), xs)
```
