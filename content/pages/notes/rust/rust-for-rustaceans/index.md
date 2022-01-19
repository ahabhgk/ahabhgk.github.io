---
title: Rust for Rustaceans
slug: /note/rust/rust-for-rustaceans
date: 2022-01-19
description: rust-for-rustaceans
tags:
  - Note
---

## Foundations

### Talking About Memory

#### Variables in Depth

在高层视角中，变量不是字节的表示，而是给值起的名字，可以看作一个有名字的点，值在初始化时被命名，作为起点，在被访问时将上一个同名的点连接，在 move、drop
时这个点消失，形成一个 “flow“，进而对 flow 进行 borrow check、drop check

[Understanding Rust Lifetimes: a visual introduction - Presentation to the Kerala Rustacaeans](https://www.youtube.com/watch?v=FSU9vZrn19w)

在底层视角中，变量是一个 “value slot”，赋值时丢弃旧值，访问时编译器检查是否为空，类似 C 的变量，这个视角主要用于明确推理内存

#### Memory Regions

Stack is a sagment of memory，当函数调用时会在 Stack 上分配一个连续的内存块，成为 “frame”，函数调用结束时这个
frame 中的内存全部会被回收，因此返回的引用必须 outlive this frame

Heap is a pool of memory，堆内存中的值需要明确的分配和释放，使 frame 中的值 outlive 可以把这个值放在堆上，线程之间不共享
stack，堆上的值可以夸线程。Rust 中主要通过 Box 分配 heap

Static memory 会被编译进二进制文件中，整个程序执行过程中都存在，如常量（const）、字符串（&'static str）。'static
生命周期表示直到程序关闭都有效，[std::thread::spawn](https://doc.rust-lang.org/std/thread/fn.spawn.html)

[Rust 中常见的有关生命周期的误解 - 2. 如果 T: 'static 那么 T 直到程序结束为止都一定是有效的](https://github.com/pretzelhammer/rust-blog/blob/master/posts/translations/zh-hans/common-rust-lifetime-misconceptions.md#2-%E5%A6%82%E6%9E%9C-t-static-%E9%82%A3%E4%B9%88-t-%E7%9B%B4%E5%88%B0%E7%A8%8B%E5%BA%8F%E7%BB%93%E6%9D%9F%E4%B8%BA%E6%AD%A2%E9%83%BD%E4%B8%80%E5%AE%9A%E6%98%AF%E6%9C%89%E6%95%88%E7%9A%84)

### Ownership

所有的值都有一个所有者，负责释放

### Borrowing and Lifetimes

#### Shared References

&T

[`impl<'_, T> Copy for &'_ T`](https://doc.rust-lang.org/std/marker/trait.Copy.html#impl-Copy-73)

[Primitive Type reference - Trait implementations](https://doc.rust-lang.org/std/primitive.reference.html#trait-implementations-1)

#### ~~Mutable~~ Exclusive Reference

&mut T

[dtolnay/macro._02__reference_types](https://docs.rs/dtolnay/latest/dtolnay/macro._02__reference_types.html)

#### Interior Mutability

通常依靠额外的机制（如原子 CPU 指令、runtime check）或不变性来提供安全的可变性，而不依赖 &mut
T。这些类型通常分为两类：一类是让你通过共享引用获得一个可变的引用，另一类是让你替换一个只给定共享引用的值

#### Lifetimes

Lifetimes and the Borrow Checker，就像之前通过 flow 进行 borrowck

Generic Lifetimes：

```rust
struct StrSplit<'s, 'p> {
  delimiter: &'p str,
  document: &'s str,
}

impl<'s, 'p> Iterator for StrSplit<'s, 'p> {
  type Item = &'s str;
  
  fn next(&self) -> Option<Self::Item> {
    todo!()
  }
}

fn str_before(s: &str, c: char) -> Option<&str> {
  StrSplit { document: s, delimiter: &c.to_string() }.next()
}
```

Lifetime Variance：covariant（协变）, invariant（不变）, and contravariant（逆变），&'a T 和 &'a mut T 对于 'a 来说都是协变的，对 T 来说就不谈了，因为 “[Subtyping in Rust is very restricted and occurs only due to variance with respect to lifetimes and between types with higher ranked lifetimes.](https://doc.rust-lang.org/stable/reference/subtyping.html)”


