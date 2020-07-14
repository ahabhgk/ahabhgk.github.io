---
title: Notes - Leetcoding
slug: /notes/leetcoding
---

## 记录

| 2020-07-14 | 2020-07-16 | 2020-07-19 | 2020-07-23 | 2020-07-28 |
|:--:|:--:|:--:|:--:|:--:|
| [283. 移动零](https://leetcode-cn.com/problems/move-zeroes/) | - [x] Eat | | | |
| [11. 盛最多水的容器](https://leetcode-cn.com/problems/container-with-most-water/) | | | | |
| [1. 两数之和](https://leetcode-cn.com/problems/two-sum/) | | | | |
| [15. 三数之和](https://leetcode-cn.com/problems/3sum/) | | | | |

| 2020- | 2020- | 2020- | 2020- | 2020- |
|:--:|:--:|:--:|:--:|:--:|
| []() | | | | |
| []() | | | | |
| []() | | | | |
| []() | | | | |

## 数组、链表、跳表

### [283. 移动零](https://leetcode-cn.com/problems/move-zeroes/)

双指针

### [11. 盛最多水的容器](https://leetcode-cn.com/problems/container-with-most-water/)

双指针，left > right 时，如果 left 不论右移多少，都比原来小，所以可以从两边双指针试

### [1. 两数之和](https://leetcode-cn.com/problems/two-sum/)

利用 Map 对一遍历过的数进行存储，如果 `map.get(target - nums[i]) != null` 就得到结果

### [15. 三数之和](https://leetcode-cn.com/problems/3sum/)

先排序，排序是为了去重，`nums[i] === nums[i - 1]` 就 continue，然后对于 `i + 1` 和 `nums.length - 1` 做双指针，当三数之和为 0 时就移动双指针，sum < 0 时就移动左指针，sum > 0 时就移动右指针

```ts
function threeSum(nums: number[]): number[][] {
  let res: number[][] = []
  if (nums.length < 3) return res
  nums.sort((a, b) => a - b)
  for (let i = 0; i < nums.length - 2; i++) {
    if (nums[i] > 0) break // 最小的数大于 0 就可以直接结束了，三个大于 0 的数之和必大于 0
    if (nums[i] === nums[i - 1]) continue // 去重
    let left = i + 1
    let right = nums.length - 1
    while (left < right) {
      let sum = nums[i] + nums[left] + nums[right]
      if (sum === 0) {
        res.push([nums[i], nums[left], nums[right]])
        while (left < right && nums[left + 1] === nums[left]) left += 1 // 去重
        while (left < right && nums[right - 1] === nums[right]) right -= 1 // 去重
        left += 1
        right -= 1
      } else if (sum < 0) {
        left += 1
      } else if (sum > 0) {
        right -= 1
      }
    }
  }
  return res
};
```

## 动态规划

### [322. 零钱兑换](https://leetcode-cn.com/problems/coin-change/)

递归法：自上而下，会有重复的计算

![dp-rec](./images/dp-rec.jpg)

```js
/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
var coinChange = function(coins, amount) {
  let memo = new Map() // memo 进行优化
  function dp(n) {
    if (memo.has(n)) return memo.get(n)
    if (n === 0) return 0
    if (n < 0) return -1
    let res = Infinity
    for (let coin of coins) {
      let sub = dp(n - coin) // 子问题
      if (sub === -1) continue
      res = Math.min(res, 1 + sub) // 找最优解
    }
    memo.set(n, res)
    return res === Infinity ? -1 : res // 无解就返回 -1
  }
  return dp(amount)
};
```

迭代法：自下而上

```js
/**
 * @param {number[]} coins
 * @param {number} amount
 * @return {number}
 */
var coinChange = function(coins, amount) {
  let dp = new Array(amount + 1).fill(amount + 1)
  dp[0] = 0 // amount 为 0 时解为 0
  for (let i = 0; i < dp.length; i++) { // 从 amount 为 0 开始计算，自下而上计算
    for (let coin of coins) { // 遍历 coins
      let left = i - coin // 子问题的 amount
      if (left < 0) continue
      dp[i] = Math.min(dp[i], 1 + dp[left] /* 子问题的解 */) // 找最优解
    }
  }
  return (dp[amount] === amount + 1) ? -1 : dp[amount]
};
```

### [96. 不同的二叉搜索树](https://leetcode-cn.com/problems/unique-binary-search-trees/)

假设 n 个节点存在的二叉搜索树有 G(n) 种，f(i) 为以 i 为根的二叉搜索树的个数

$$G(n)=f(1)+f(2)+f(3)+...+f(n)$$

$$f(i)=G(i-1)*G(n-i)$$

得到：

$$G(n) = \sum_{i=1}^n G(i-1) * G(n-i)$$

递归法：

```js
/**
 * @param {number} n
 * @return {number}
 */
let memo = [1, 1]
var numTrees = function(n) {
  if (m = memo[n]) return m
  let res = 0
  for (let i = 1; i <= n; i++) {
    res += numTrees(i - 1) * numTrees(n - i) // 子问题
  }
  memo[n] = res
  return res
};
```

迭代法：

```js
/**
 * @param {number} n
 * @return {number}
 */
var numTrees = function(n) {
  let dp = new Array(n + 1).fill(0)
  dp[0] = 1, dp[1] = 1
  for (let m = 2; m <= n; m++) { // 2 ～ n 的解
    for (let i = 1; i <= m; i++) {
      dp[m] += dp[i - 1] * dp[m - i] // 子问题
    }
  }
  return dp[n]
};
```

### [剑指 Offer 14- II. 剪绳子 II](https://leetcode-cn.com/problems/jian-sheng-zi-ii-lcof/)

先看不需要求模的版本

```js
/**
 * @param {number} n
 * @return {number}
 */
var cuttingRope = function(n) {
  let dp = new Array(n + 1).fill(0)
  ;[dp[0], dp[1]] = [0, 1]
  for (let i = 2; i <= n; i++) { // 自下而上，先求 0 1 2... 的结果，求上去得到 n 的
    for (let j = 1; j <= i; j++) { // 剪多长
      dp[i] = Math.max(dp[i], dp[i - j] * j, (i - j) * j) // 剪了还剪、剪了就不剪了
    }
  }
  return dp[n]
};
```

但是在需要求模时就不行了，因为 Math.max 不能正确比较出经过求模后的原来的最大值，如果先比较后求模又会溢出

所以可以用贪心：因为 1 和任何一个更大的数就有更大的，2 可以，3 可以，4 拆成两个 2 效果一样，5 可以拆成 2 * 3

```js
/**
 * @param {number} n
 * @return {number}
 */
var cuttingRope = function(n) {
  if (n < 3) return 1
  if (n === 3) return 2
  let res = 1
  let mod = 1000000007
  while (n > 4) {
    res = (res * 3) % mod
    n -= 3
  }
  return (res * n) % mod
};
```

对此就是求 3 的幂，可以使用快速幂进行进一步优化

因为 $(xy) \mod p = [(x \mod p) * (y \mod p)] \mod p$，所以可以同时取余防止溢出

```js
// 递归快速幂
function qpow(a, n) { // a ** n
  if (n === 1) return 1
  if (n % 2 === 1) return qpow(a, n - 1) * a % MOD
  let tmp = qpow(a, Math.floor(n / 2) % MOD)
  return tmp * tmp % MOD
}
```

```js
// 迭代快速幂，7 ^ 10 = 7 ^ 0b1010 = 7 ^ 0b1000 * 7 ^ 0b10
function qpow(a, n) {
  let res = 1
  while (n > 0) {
    if ((n & 1) === 1) {
      res *= a
      res = res % MOD
    }
    a *= a // 相当于左移
    a = a % MOD
    n = n >> 1
  }
  return res
}
```

![qpow](./images/qpow.png)

因为取余是为了防溢出，所以 JS 也可以使用 BigInt，最后取余（具体类似于前两个代码块版本，只不过 number 全都变为 BigInt，最后再取余）
