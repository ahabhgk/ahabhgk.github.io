---
title: Notes - Leetcoding
slug: /notes/leetcoding
---

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
