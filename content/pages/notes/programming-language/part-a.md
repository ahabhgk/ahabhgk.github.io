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

- Syntax is just how you write something
- Semantics is what that something means
  - Type-checking (before program runs)
  - Evaluation (as program runs)
- For variable bindings:
  - Type-check expression and extend static environment
  - Evaluate expression and extend dynamic environment
