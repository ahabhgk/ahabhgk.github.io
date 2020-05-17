function heapify(arr, n, i) {
  while (true) {
    let maxPos = i
    if (i * 2 <= n && arr[i] < arr[i * 2]) maxPos = i * 2
    if (i * 2 + 1 <= n && arr[maxPos] < arr[i * 2 + 1]) maxPos = i * 2 + 1
    if (maxPos === i) break
    ;[arr[i], arr[maxPos]] = [arr[maxPos], arr[i]]
    i = maxPos
  }
}

function heapSort(arr) {
  function buildHeap(arr) {
    for (let i = Math.floor(arr.length / 2); i > 0; i--) {
      heapify(arr, arr.length, i)
    }
  }
  buildHeap(arr)
  let k = arr.length - 1
  while (k > 1) {
    ;[arr[1], arr[k]] = [arr[k], arr[1]]
    k -= 1
    heapify(arr, k, 1)
  }
  return arr
}

console.log(heapSort([0, 1, 3, 2, 5, 4, 2, 1, 0]))