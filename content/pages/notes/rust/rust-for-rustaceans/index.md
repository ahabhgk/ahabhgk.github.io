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

Lifetime Variance：covariant（协变）, invariant（不变）, and contravariant（逆变），&'a T 和
&'a mut T 对于 'a 来说都是协变的，对 T 来说就不谈了，因为
“[Subtyping in Rust is very restricted and occurs only due to variance with respect to lifetimes and between types with higher ranked lifetimes.](https://doc.rust-lang.org/stable/reference/subtyping.html)”

## Types

### Types in Memory

#### Alignment

为了减少硬件读取内存的次数需要对齐，所以类型所占内存的大小都得是其 align 的倍数，u8 是一字节对齐，u16
两字节对齐，复杂类型按包含类型的最大的对齐方式对齐

#### Layout

```rust
#[repr(C)]
struct Foo {
  tiny: bool, // 1
  // _p1: [0; 3], // 3
  normal: u32, // 4
  small: u8, // 1
  // _p2: [0; 7] // 7
  long: u64, // 8
  short: u16, // 2
  // _p3: [0; 6] // 6
}

std::mem::align_of::<Foo>(); // 8
std::mem::size_of::<Foo>(); // 32
```

`repr(C)` 的布局是这样的，`repr(Rust)` 的布局会进行各种优化，使其顺序改变，所以即使两个不同的类型共享所有相同的字段、相同的类型、相同的顺序，也不能保证它们的布局是一样的

```rust
struct Foo {
  tiny: bool, // 1
  normal: u32, // 4
  small: u8, // 1
  long: u64, // 8
  short: u16, // 2

  // long: u64, // 8
  // normal: u32, // 4
  // short: u16, // 2
  // tiny: bool, // 1
  // small: u8, // 1
}

std::mem::align_of::<Foo>(); // 8
std::mem::size_of::<Foo>(); // 16
```

[Visualizing memory layout of Rust's data types](https://www.youtube.com/watch?v=rDoqT-a6UFg&t=2080s)

#### Dynamically Sized Types and Wide Pointers

Sized 是一个 auto trait，因为太常用了大部分类型都实现了它，除了 trait object 和 slice，他们的大小在运行时才能知道，编译时推断不出来，这些类型需要放在指针后面（`&[u8]`、`Box<dyn Iterator>`）

### Traits and Trait Bounds

#### Compilation and Dispatch

讲的 static dispatch 和 dynamic dispatch

#### Generic Traits

Rust 使 trait 变得 generic 的方式主要有两种：泛型参数（`trait Foo<T> { ... }`）、关联类型（`trait Foo { type Item; ... }`）

如果只希望类型对 trait 的实现只有一个，就用关联类型，否则用泛型参数，比如 `Iterator`，`Iterator::Item` 只能有一个，`From<T>` 可以有多个

#### Coherence and the Orphan Rule

为了明确类型的方法的实现是哪个，防止类似自己 `impl Display for bool` 影响其他 crate 中 bool 使用的情况，Rust 提出孤儿原则：只有当一个 trait 或 type 属于你的 crate 时，你才能为该 type 实现该 trait

孤儿原则也有些额外的影响：

1. 允许 `impl<T> MyTrait for T where T: ...` 这种适用广泛类型的实现，但添加时为 brake change，可能会导致下游 crate 使用的方法冲突而无法编译
2. 使用 `#[fundamental]` 属性的类型包括 `&`、`&mut`、`Box`，可以为其 `impl MyTrait for &Foo`
3. `impl From<MyType> for Vec<usize>` 这种有一部分是允许的

#### Trait Bounds

这样是可以的，渐进式的确认类型很有帮助

```rust
fn foo(s: String) -> String where String: Clone  {
  s.clone()
}
```

HRTB：If you write F: Fn(&T) -> &U, you need to provide a lifetime for those refer- ences, but you really want to say “any lifetime as long as the output is the same as the input.” Using a higher-ranked lifetime, you can write F: for<'a> Fn(&'a T) -> &'a U to say that for any lifetime 'a, the bound must hold. The Rust compiler is smart enough that it automatically adds the for when you write Fn bounds with references like this, which covers the majority of use cases for this feature.

#### Marker Traits

包括 Copy、Send、Sync、Sized、Unpin，同时除了 Copy 都是 auto trait

Unit Type 的一个例子，状态模式：

```rust
use std::marker::PhantomData;

struct Authenticated;
struct Unauthenticated;
struct SshConnection<S> {
  _marker: PhantomData<S>,
}

impl<S> SshConnection<S> {
  pub fn new() -> SshConnection<Unauthenticated> {
    SshConnection::<Unauthenticated> { _marker: PhantomData }
  }
}

impl SshConnection<Unauthenticated> {
  pub fn connect(&mut self) -> SshConnection<Authenticated> {
    SshConnection::<Authenticated> { _marker: PhantomData }
  }
}
```

### Existential Types

```rust
fn foo() -> impl Future<Output = i32> {}
```

```rust
#![feature(type_alias_impl_trait)] // see https://github.com/rust-lang/rust/issues/63063

struct Foo {
  v: Vec<i32>,
}

impl IntoIterator for Foo {
  type Item = i32;
  type IntoIter = impl Iterator<Item = Self::Item>;

  fn into_iter(self) -> Self::IntoIter {
    self.v.into_iter()
  }
}
```

## Designing Interfaces

See also:

- [API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [rfc#1105: API Evolution](https://rust-lang.github.io/rfcs/1105-api-evolution.html)
- [The Cargo Book - semver](https://doc.rust-lang.org/cargo/reference/semver.html)

### Unsurprising

#### Naming Practices

into_、as_、to_、iter、iter_mut、get、get_mut……

#### Common Traits for Types

1. Debug
2. Sync、Send、Unpin、Sized auto-traits
3. Clone、Default，如果不能实现要文档说明
4. PartialEq 以便 assert_eq!
5. PartialOrd、Hash 可能用于作为 key 时实现
6. Eq、Ord 语义有额外要求，符合时实现
7. serde 的 Serialize 和 Deserialize，不想添加必要依赖可开 feature “serde” 提供
8. 尽量不实现 Copy，破坏 move 语义，而且去掉 Copy 是 break change

#### Ergonomic Trait Implementations

```rust
trait Foo {
  fn foo(&self);
}

impl<T> Foo for &T where T: Foo {
  fn foo(&self) {
    Foo::foo(*self);
  }
}

impl<T> Foo for &mut T where T: Foo {
  fn foo(&self) {
    Foo::foo(*self);
  }
}

impl<T> Foo for Box<T> where T: Foo {
  fn foo(&self) {
    Foo::foo(&**self);
  }
}

struct Fo;

impl Foo for Fo {
  fn foo(&self) {
    println!("foo");
  }
}

fn fooo<T>(f: T) where T: Foo {
  f.foo();
}

fn main() {
  let f = &Fo;
  fooo(f);
  let f = &mut Fo;
  fooo(f);
  let f = Box::new(Fo);
  fooo(f);
}
```

#### Wrapper Types

- `Deref`：方便 `.` 调用 Target 上的方法
- `AsRef`：方便 &Wrapper 作为 &Inner 使用
- `From<Inner>`、`From<Wrapper>`：方便添加和删除这层包装

Borrow 只适用于你的类型本质上等同于另一个类型的情况，如 &String 和 &str

### Flexible
