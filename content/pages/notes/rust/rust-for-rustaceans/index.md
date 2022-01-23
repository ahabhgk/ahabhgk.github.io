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

#### Generic Arguments

static dispatch 容易使类型变的复杂，有时可以用 dynamic dispatch 代替以减少复杂度，不过需要考虑

- dynamic dispatch 有性能损耗
- 复杂的情况下 Rust 不知道如何构建 vtable（&dyn Hash + Eq）
- static dispatch 的代码用户可以自己调用时传入 trait object 以 dynamic dispatch 的方式使用

```rust
fn foo<T: Debug>(f: T) {
  dbg!(f);
}

fn main() {
  let d: &dyn Debug = &"hah".to_owned();
  foo(d);
}
```

所以对 lib 来说 static dispatch 的接口更好，app 来说因为是最下游两种都可以

一开始使用具体类型之后逐渐改为泛型是可行的，但并不一定都是向后兼容的：

```rust
fn foo(v: &Vec<i32>) {}
// =>
fn foo(v: impl AsRef<[i32]>)
// 虽然 Vec<T> 实现了 AsRef<T>，但用户可能会这样调用：
foo(&iter.collect()) // 导致 collect 的类型推断失效
```

#### Object Safety

trait 的设计应该考虑到是否有 trait object 的场景，一般倾向于需要实现，因为增加了 dyn 的使用方式

- 泛型方法上的泛型可不可以放到 trait 上，以保证 object safety
- 可以为不需要 dyn 的方法添加 Self: Sized

object safety 是 API 的一部分，需注意兼容性

#### Borrowed vs. Owned

API 对数据的 Owned 和 Borrowed 要仔细判断

#### Fallible and Blocking Destructors

一些 I/O 的 destructor 可能阻塞甚至失败，需要显式的解构，`Option::take`、`std::mem::take`、`ManuallyDrop` 可能会比较有用

### Obvious

有时我们的类型需要先调用 foo 然后再调用 bar，但用户并不知道

#### Documentation

- 会 panic 的函数写明 Panic
- Err 返回的原因
- 对于 unsafe 的函数写明 Safety
- examples 质量，用户很可能复制这里的代码
- 组织文档，文档内链接，`#[doc(hidden)]` 标记不想公开的接口
- `#[doc(cfg(..))]` 标记某些情况下才会用到的接口，`#[doc(alias = "...")]` 方便搜索

#### Type System Guidance

newtype、enum…… 实现 **semantic typing**

zero-sized type 表示：

```rust
struct Grounded;
struct Launched;

struct Rocket<Stage = Grounded> {
  stage: std::marker::PhantomData<Stage>,
}

impl Default for Rocket<Grounded> {}

impl Rocket<Grounded> {
  pub fn launch(self) -> Rocket<Launched> {}
}

impl Rocket<Launched> {
  pub fn accelerate(&mut self) {}
  pub fn decelerate(&mut self) {}
}

impl<Stage> Rocket<Stage> {
  pub fn color(&self) -> Color {}
  pub fn weight(&self) -> Kilograms {}
}
```

### Constrained

向后兼容

#### Type Modifications

尽量少的 pub 给用户会帮助我们控制代码

`#[non_exhaustive]` 可以避免用户 match、构造等可能需要枚举类型所有属性的操作，等类型稳定后请避免使用它

#### Trait Implementations

trait 的修改往往是 break 的

```rust
pub trait CanUseCannotImplement: sealed::Sealed {
  // ...
}

mod sealed {
  pub trait Sealed {}
  impl<T> Sealed for T where T: TraitBounds {}
}

impl<T> CanUseCannotImplement for T where T: TraitBounds {}
```

## Error Handling

### Representing Errors

#### Enumeration

1. 实现 `std::error::Error`
2. 实现 `std::fmt::Display`
3. 尽量实现 Send、Sync，把 Rc、RefCell 放到 Error 中时需要考虑 Error 是否需要跨线程

see [std::io::Error](https://doc.rust-lang.org/src/std/io/error.rs.html#58-60)

#### Opaque Errors

并不是所有 lib 都适合 Enumeration 这种方案，对于错误原因并不重要的情况更适合用不透明的 Error 表示，比如：一个图像解码库，解码失败时图像头中的大小字段无效或者压缩算法未能解压一个块这种具体的原因对用户来说也许并不重要，因为即使知道了也无法恢复错误，而不透明错误使库更容易使用，大大减小 API 复杂度（内部可以细化，但没必要暴露给用户）

通常是 `Box<dyn Error + ...>` 这样的，但 `Box<dyn Error + Send + Sync + 'static>` 可以使用户使用 `Error::downcast_ref` 特化 Error 进行处理

### Propagating Errors

`?` 其实就是 `std::Ops::Try` trait，不过目前来没有稳定

`try { ... }` try block 的场景，不过也没稳定：

```rust
fn do_it() -> Result<(), Error> {
  let t = Thing::setup();
  t.work()?; // Err 后会直接返回，没有 cleanup
  t.cleanup();
  Ok(())
}

fn try_it() -> Result<(), Error> {
  let t = Thing::setup();
  let r = try { t.work()? };
  t.cleanup();
  r
}
```

## Project Structure

### Features

添加 optional 的 crate 和改变代码，以开启额外功能

#### Defining and Including Features

Cargo 中可以定义 features，默认使用的可以定义为 default

Cargo 使每个可选依赖关系都成为与依赖关系同名的 features，所以会有命名冲突

```toml
[features]
derive = ["syn"]

[dependencies]
syn = { version = "1", optional = true }
```

也可以开启依赖的一些 features

```toml
[features]
derive = ["syn/derive"]

[dependencies]
syn = { version = "1", optional = true }
```

#### Using Features in Your Crate

`#[cfg(feature = "some-feature")]` 和 `cfg!(feature = "some-feature))` 来控制 conditional compilation

## Testing

### Rust Testing Mechanisms

`#[test]`, `#[should_panic]`, `#[cfg(test)]`, Integration tests (the tests in tests/), `compile_fail in doctests`, `# in doctests`...

### Additional Testing Tools

- clippy
- cargo-fuzz
- miri
- loom


## Marcos

### Declarative Macros


