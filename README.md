---
theme: cyanosis
---
## 前言
如果你对 Promise 一无所知，[Promise 入门，不妨看看这篇文章](https://juejin.cn/post/7057069041558503461)。当我们知道 `什么是 Promise`、 `Promise 解决了什么问题`，除了日常工作的使用之外，手写 Promise 也必然是需要掌握的一个知识点，今天就跟着大家从 0 实现一个 Promise

## 规范标准
在手写 Promise 之前，我们有必要了解一下 [Promises/A+ 规范](https://promisesaplus.com/)，根据规范的内容指导，从而进一步的合理设计实现一个符合标准的 Promise

## new Promise
先看一段生成 pormise 实例的代码
```
const promise = new Promise((resolve, reject) => { // 执行器
  // 异步操作代码...
})
```
-   Promise 作为一个`构造函数`，通过 `new` 操作符可创建一个 promise 实例

-  `该构造函数接收一个函数作为参数`，这个函数我们通常称为`执行器（executor）`函数

-   `执行器函数接收两个参数`：这两个参数作为`函数`可调用并可以传入相应数据，通常我们以`resolve`和`reject`进行命名

### 创建 Promise 类
根据上述示例与描述，现在可以先构造一个初步的 Promise 类
> - 定义 executor，接收实例传过来的执行器函数
> - 初始状态， Promise 具备三种状态：pending、fulfilled（有时候也称为 resolved ）、rejected。初始状态为 `pending`。
> - 初始 value （终值）， 它是任何一个合法的 JavaScript 值。
> - 初始 reason (拒因) 。

创建一个 MyPromise 类，并进行初始操作
```
// 定义 Promise 的三种状态
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

// 定义 MyPromise 类
class MyPromise { 
  constructor(executor) {
    // 初始状态为 pending
    this.status = PENDING
    
    // 初始 value 与 reason
    this.value = undefined
    this.reason = undefined
  }
}
```
### resolve 与 reject
回顾一下调用这两个函数的作用
```
const promise = new Promise((resolve, reject) => {
    // 异步操作代码
  setTimeout(() => {
    const rand = Math.random() * 100
    if (rand >= 50) {
        // 成功时执行
      resolve('success')
    } else {
        // 失败时执行
      reject('error')
    }
  }, 1000)
})
```
> `resolve`函数：将 promise 实例的状态从 `pending 变为 resolved`，在异步操作成功时调用，并将异步操作的结果，作为参数进行传递
>
> `reject`函数： 将 promise 实例的状态从 `pending 变为 fulfilled`，在异步操作失败时调用，并将异步操作报出的错误，作为参数进行传递

MyPromise 类中，我们定义 resolve 函数 和 reject 函数，并在函数体内进行status、value 或 reason的更新，同时`调用 executor 执行器，传入 resolve 和 reject`
```
// ...
class MyPromise {
  constructor(executor) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    
    // 定义 resolve
    const resolve = value => {
      // 更新状态
      this.status = FULFILLED
      // 更新 value
      this.value = value
    }
    // 定义 reject
    const reject = reason => {
      // 更新状态
      this.status = REJECTED
      // 更新 reason
      this.reason = reason
    }
    // 调用执行器，将 resolve 与 reject 作为参数传递出去
    executor(resolve, reject)
  }
}
```
测试

```
// 通过 MyPromise 生成 p1 实例， 执行 resolve 并传递 success 参数
const p1 = new MyPromise((resolve, reject) => {
  resolve('success')
})
console.log(p1) // MyPromise {status: 'fulfilled', value: 'success', reason: undefined}

// 通过 MyPromise 生成 p2 实例， 执行 reject 并传递 error 参数
const p2 = new MyPromise((resolve, reject) => {
  reject('error')
})
console.log(p2) // MyPromise {status: 'rejected', value: undefined, reason: 'error'}
```
初步测试，没问题

### 状态不可逆
根据规范可知，Promise 必须处于 `pending、fulfilled、rejected` 三种状态之一，`而状态一旦发生改变，则该状态就是落定了，不可逆的，将来都不再会发生改变`

测试此前写的代码
```
const p = new MyPromise((resolve, reject) => {
  // 依次执行 resolve 和 reject
  resolve('success')
  reject('error')
})

console.log(p) // MyPromise {status: 'rejected', value: 'success', reason: 'error'}
```
很显然，状态从 pending 过渡到 fulfilled，再从 fulfilled 过渡到 rejected，同时导致 value 和 reason 都有值，这并不符合我们的规范

### 状态落定
MyPromise 类中，通过添加判断，实现最终的状态落定，即如果状态发生改变，便永不可逆
```
// ...
class MyPromise {
  constructor(executor) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined

    const resolve = value => {
      // 添加判断
      if (this.status === PENDING) {
        this.status = FULFILLED
        this.value = value
      }
    }
    const reject = reason => {
      // 添加判断
      if (this.status === PENDING) {
        this.status = REJECTED
        this.reason = reason
      }
    }
    executor(resolve, reject)
  }
}
```
状态已经落定
```
const p = new MyPromise((resolve, reject) => {
  resolve('success')
  reject('error')
})

console.log(p) // MyPromise {status: 'fulfilled', value: 'success', reason: undefined}
```

`上面的结果显示，状态改变后，便不会再改变了`

### 抛出异常
> 除了通过调用 resolve、reject 可以改变状态，执行器内抛出异常，也是可以将`pending 状态变为 rejected`

执行器（executor）函数内改变状态的几种方式
```
// 初始状态
new Promise((resolve, reject) => {}) // pending 最初状态

// 执行 resolve
new Promise((resolve, reject) => resolve()) // fulfilled 已成功状态

// 执行 reject
new Promise((resolve, reject) => reject()) // rejected 已失败状态

// 抛出异常
new Promise((resolve, reject) => { throw new Error('error') }) // rejected 已失败状态
```
MyPromise 类中，我们通过 try catch 进行捕获，如果捕获到错误就调用 reject

```
class MyPromise {
  constructor(executor) {
    // ...
    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }
}
```
测试

```
const p = new MyPromise((resolve, reject) => {
  throw 'error'
})

console.log(p) // MyPromise {status: 'rejected', value: undefined, reason: 'error'}
```

### 小结
我们创建了一个初步的 Promise 类，定义了三种状态，并初始化status、value、reason。定义 resolve 和 reject 更新status、value、reason，并在这两个函数体内添加判断最终落定状态，通过调用执行器（executor）将这两个函数作为参数进行传递。使用 try catch 进行错误的捕获，从而在执行器（executor）函数体内抛出异常时可将 promise 实例状态 变为 rejected

```
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MyPromise {
  constructor(executor) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined

    const resolve = value => {
      if (this.status === PENDING) {
        this.status = FULFILLED
        this.value = value
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {
        this.status = REJECTED
        this.reason = reason
      }
    }
    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }
}
```
![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/98348b1d6c7242deac6b3b89558c665d~tplv-k3u1fbpfcp-watermark.image?)


## Promise.prototype.then
相信大家都知道 Promise 相关的Api，其中包括其原型对象上的方法，及其静态方法。

根据规范可知，Promise 必须提供一个 then 方法以访问值（value、reason）

回顾一下 then 方法的使用
```
// 定义 promise1 实例，执行器内直接调用 resolve
const promise1 = new Promise((resolve, reject) => {
  resolve('success')
})

// 调用 promise1 的 then 方法
promise1.then(value => {console.log(value)})

// 定义 promise2 实例，执行器内异步操作在一秒钟之后随机调用 resolve 或 reject
const promise2 = new Promise((resolve, reject) => {
  setTimeout(() => {
    const rand = Math.random() * 100
    if (rand >= 50) {
      resolve('success')
    } else {
      reject('error')
    }
  }, 1000)
})
// 调用 promise2 的 then 方法
promise2.then(value => {console.log(value)}, error => {console.log(error)})

```
### 关于参数
> promise.then(onFulfilled, onRejected)
>
> then 方法接收`两个可选参数`（onFulfilled 处理程序，onRejected 处理程序）
> -   提供第一个参数 onFulfilled 处理程序：`fulfilled`状态的回调函数
> -  提供第二个参数 onRejected 处理程序：`rejected`状态的回调函数
> 根据规范可知，`若 onFulfilled、 onRejected 不是函数，则必须忽略它们`，所谓忽略，我们可以通过手动赋值一个函数，帮助其返回对应的 value 或 reason

MyPromise 类中，我们定义一个 then 方法

```
// ...
class MyPromise {
  constructor(executor) { ... }
  
  // 定义 then 方法
  then(onFulfilled, onRejected) {
    // 判断 onFulfilled 是否为函数，若不是函数，便赋值一个函数，然后返回 value
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    
    // 判断 onRejected 是否为函数，若不是函数，则赋值一个函数，然后 throw reason
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
    
    // 判断当前状态是否为 fulfilled，执行 onFulfilled
    if(this.status === FULFILLED) onFulfilled(this.value)
    
    // 判断当前状态是否为 rejected，执行 onRejected
    if(this.status === REJECTED) onRejected(this.reason)
  }
}
```
测试
```
// 定义 promise1 实例，执行器内直接调用 resolve
const promise1 = new MyPromise((resolve, reject) => {
  resolve('success')
})
promise1.then(value => {console.log(value)}) // success

// 定义 promise1 实例，执行器内异步操作一秒钟之后调用 resolve
const promise2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})
promise2.then(value => {console.log(value)}) // 什么都没打印
```
`在上面代码中，执行器内同步调用 resolve，then 方法中的处理程序是正常输出的，但是执行器内异步操作调用 resolve，then 方法中的处理程序是未能正常输出的，这是什么原因呢？`

### 关于异步操作
出现上诉问题是因为，执行器函数体内异步操作时，promise 的状态当时还处于初始状态 `pending`

下面打印一下顺序
```
// ...
class MyPromise {
  constructor(executor) {
    // ...
    const resolve = value => {
      if (this.status === PENDING) {
        console.log('状态改变') // 3 状态改变
        this.status = FULFILLED
        this.value = value
      }
    }
    // ...
  }
  then(onFulfilled, onRejected) {
    console.log('执行then') // 1 执行then
    // ...
}
const promise2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    console.log('定时器内部操作') // 2 定时器内部操作
    resolve('success')
  }, 1000)
})
promise2.then(value => {console.log(value)}) // success
```
根据上面的打印输出可以知道顺序 `1 执行 then > 2 定时器内部操作 > 3 状态改变`，执行 then 时，而状态没有发生改变，`根本不会执行 onFulfilled 或 onRejected`。如何解决该问题呢

1. then 方法中判断初始状态，`并且因为同一个实例，then 方法是可以被调用多次的`，所以我们应该定义`两个数组分别存储 onFulfilled、onRejected`，将来可以依次调用
```
// ...
then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
    
    if(this.status === FULFILLED) onFulfilled(this.value)
    if(this.status === REJECTED) onRejected(this.reason)
    
    // 添加多一个判断
    // 如果当前状态为 pending，则将 onFulfilled 和 onRejected 分别存储到 this.onFulfilledCallbacks 和 this.onRejectedCallbacks 数组中
    if (this.status === PENDING) {
      this.onFulfilledCallbacks.push(onFulfilled.bind(this))
      this.onRejectedCallbacks.push(onRejected.bind(this))
    }
  }  
```
2. resolve 和 reject 依次执行对应的处理程序
```
// ...

// 存储 onFulfilled 和 onRejected 的回调函数数组
this.onFulfilledCallbacks = []
this.onRejectedCallbacks = []

const resolve = value => {
  if (this.status === PENDING) {
    this.status = FULFILLED
    this.value = value
    
    // 依次执行 onFulfilledCallbacks 数组中的回调函数
    this.onFulfilledCallbacks.forEach(callback => callback(value))
  }
}
const reject = reason => {
  if (this.status === PENDING) {
    this.status = REJECTED
    this.reason = reason
    
    // 依次执行 onRejectedCallbacks 数组中的回调函数
    this.onRejectedCallbacks.forEach(callback => callback(reason))
  }
}
// ...
```
> then 方法中，当状态为 `fulfilled` 或 `rejected` 的时候，直接执行对应的处理程序。 当处于初始状态 `pending` 的时候，我们`将 onFulfilled 和 onRejected 分别存储到对应的 this.onFulfilledCallbacks 和 this.onRejectedCallbacks 回调数组中`，然后在 `resolve 和 reject 中依次执行对应回调数组中的回调函数`

测试
```
const promise1 = new MyPromise((resolve, reject) => {
  resolve('success')
})
promise1.then(value => {console.log(value)}) // success

const promise2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})
promise2.then(value => {console.log(value)}) // success
```
此时不管是同步操作，还是异步操作都已经没问题了

### 关于返回值
```
promise2 = promise1.then(onFulfilled, onRejected)
```
> 如果其中一个`onFulfilled`或`onRejected`返回一个值`x`，`则运行 promise 解决程序`。
>
> 如果其中一个`onFulfilled`或`onRejected`抛出异常`e`，则`promise2`必须以拒绝`e`为理由
>
> 如果`onFulfilled`不是一个函数并且`promise1`被满足，则`promise2`必须以与 相同的值来满足`promise1`
>
> 如果`onRejected`不是函数并且`promise1`被拒绝，则`promise2`必须以与 相同的原因被拒绝`promise1`
根据规范可知，then 方法必须返回一个新的 promise，这也是为什么可以进行链式调用，下面我们根据步骤改造 then 方法


 1. 每个判断中，我们都返回一个`新的 promise`
 2. 新 promise 执行器内我们都通过 `try catch 进行异常捕获`，如果捕获到异常，则`拒绝 promise 并返回拒因`
 3. 若处理程序（onFulfilled, onRejected）`非函数`， `fulfilled`状态中返回`终值`，`rejected`状态中则返回`拒因`
 4. 若处理程序（onFulfilled, onRejected）是一个函数，返回 x 值，执行 `_Resolve（promise 解决程序）` （_Resolve 在第二部分代码中）
 5. 当状态是 `pending` 的时候，`this.onRejectedCallbacks 和 this.onFulfilledCallbacks` 回调数组，`存储一个个匿名函数`，`函数体内部执行上述 2, 3, 4 操作`
```
then(onFulfilled, onRejected) {
  if (this.status === FULFILLED) {
    const promise2 = new MyPromise((resolve, reject) => {
      try {
        if (typeof onFulfilled !== 'function') {
          resolve(this.value)
        } else {
          const x = onFulfilled(this.value)
          _Resolve(promise2, x, resolve, reject)
        }
      } catch (error) {
        reject(error)
      }
    })
    return promise2
  }
  if (this.status === REJECTED) {
    const promise2 = new MyPromise((resolve, reject) => {
      try {
        if (typeof onRejected !== 'function') {
          reject(this.reason)
        } else {
          const x = onRejected(this.reason)
          _Resolve(promise2, x, resolve, reject)
        }
      } catch (error) {
        reject(error)
      }
    })
    return promise2
  }
  if (this.status === PENDING) {
    const promise2 = new MyPromise((resolve, reject) => {
      this.onFulfilledCallbacks.push(() => {
        try {
          if (typeof onFulfilled !== 'function') {
            resolve(this.value)
          } else {
            const x = onFulfilled(this.value)
            _Resolve(promise2, x, resolve, reject)
          }
        } catch (error) {
          reject(error)
        }
      })
      this.onRejectedCallbacks.push(() => {
        try {
          if (typeof onRejected !== 'function') {
            reject(this.reason)
          } else {
            const x = onRejected(this.reason)
            _Resolve(promise2, x, resolve, reject)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
    return promise2
  }
}
```

定义 `_Resolve` 作为 promise 解决程序
- 如果 `promise` 和 `x` 引用的同一对象，则以一个 `TypeError` 作为拒因。
- 如果 `x` 是一个 `promise 实例`，则使用`该 promise 的状态作为新 promise 的状态`
- 如果 `x` 不是一个对象或函数，则完成 promise 返回 x
- 如果 `x` 是一个对象或函数
    - x.then 可能会抛出异常，通过 then = x.then 这种方式，再使用 try catch 进行异常捕获，如果检索属性 x.then 导致抛出异常，则以 e 拒绝 promise
    - 如果 `then` 不是函数，则完成 promise 返回 x
    - 如果 `then` 是一个函数，则通过 call 进行调用并使用 x 作为 this，传入第一个参数resolvePromise 和第二个参数 rejectPromise
        - resolvePromise 被调用 接受 y，运行[[Resolve]](promise, y)
        - rejectPromise 被调用，则以 r 拒绝 promiser
        -  如果同时调用`resolvePromise` 和 `rejectPromise`或多次调用同一个参数，则第一个调用优先，并且任何进一步的调用都将被忽略
        - 如果调用 `then` 抛出异常 `e`，
            - 如果`resolvePromise`或`rejectPromise`已被调用，请忽略它
            - 否则，以 `e` 拒绝 promise
```
const _Resolve = (promise, x, resolve, reject) => {
  // 如果promise 和 x 引用同一个对象，promise 则以一个 TypeError 作为拒因
 if (promise === x) return reject(new TypeError('Chaining cycle detected for promise'))
 // 如果 x 为对象或者函数(x 也有可能是一个 promise 实例)，这里注意使用 typeof 判断 null 的时候 是 object
 if ((typeof x === 'object' || typeof x === 'function') && x !== null) {
   let then
   try {
     // then 赋值 x.then
     then = x.then
   } catch (error) {
     // 如果检索属性 x.then 导致抛出异常，则以 e 拒绝 promise
     return reject(error)
   }
   // 判断 x.then 是否为函数
   if (typeof then === 'function') {
     // 定义isRun 将来判断 resolvePromise 和 rejectPromise 是否调同时调用及多次调用同一个参数
     // 如果是，则第一个调用优先，并且任何进一步的调用都将被忽略
     let isRun = false
     try {
       // 如果then是一个函数，则通过 call 进行调用 并使用 x 作为 this、传入第一个参数resolvePromise 和 第二个参数 rejectPromise
       // resolvePromise 被调用 接受 y，运行[[Resolve]](promise, y)
       const resolvePromise = (y) => {
         if (isRun) return
         isRun = true
         // 运行[[Resolve]](promise, y)
         return _Resolve(promise, y, resolve, reject)
       }
       // rejectPromise 被调用，则以 r 拒绝。promiser
       const rejectPromise = (r) => {
         if (isRun) return
         isRun = true
         // 拒绝。promiser
         reject(r)
       }
       // 使用 x 作为 this， then 调用，并传入 resolvePromise 和 rejectPromise
       then.call(x, resolvePromise, rejectPromise)
     } catch (error) {
       // then抛出异常e
       if (isRun) return
       // 以 e 拒绝 promise
       reject(error)
     }
   } else {
     // 如果then不是函数，则 resolve promise 为 x
     resolve(x)
   }
 } else {
   // 如果 x 不是对象或函数，则 resolve promise 为 x
   resolve(x)
 }
}
```


> 上面代码中，比较复杂的是 promise 处理程序。promise 处理程序解决过程是一个抽象操作，我对返回的新的 promise 的 status、value、reason，以我自己的理解总结了以下几点
> 
> - 处理程序中抛出异常，新 promise 实例的状态值为 rejected，结果值便是抛出的拒因（reason）
> - 处理程序中返回非 promise 的任意值，新 promise 实例的状态值为 fulfilled，结果值便是终值 (value)
> - 处理程序中手动返回一个 promise（例如：promise.resolve、promise.reject），此新的promise 的结果便是手动返回的 promise 的结果




### 关于执行机制
原生 Promise
```
let result = null
const promise1 = new Promise((resolve, reject) => {
  // 直接调用 resolve
  resolve({name: 'James', age: 36})
})
promise1.then(value => {
  // 赋值  
  result = value
})

console.log(result) // null
```
MyPromise
```
let result = null
const promise1 = new Promise((resolve, reject) => {
  // 直接调用 resolve 
  resolve({name: 'James', age: 36})
})
promise1.then(value => {
  // 赋值  
  result = value
})

console.log(result) // {name: 'James', age: 36}
```
`通过对比可以发现，我们实现的 Promise 和 原生 Promise 还是有点不同的`，原生 promise 的 then 方法是异步的，准确点来说，他会被列入`微任务`队列待执行。我们如何实现呢？

我们可在 then 方法当中使用 `queueMicrotask` 将处理程序放到微任务队列中等待执行
```
//...
if (this.status === FULFILLED) {
  const promise2 = new MyPromise((resolve, reject) => {
   // 使用 queueMicrotask
    queueMicrotask(() => {
      try {
        if (typeof onFulfilled !== 'function') {
          resolve(this.value)
        } else {
          const x = onFulfilled(this.value)
          _Resolve(promise2, x, resolve, reject)
        }
      } catch (error) {
        reject(error)
      }
    })
  })
  return promise2
}
if (this.status === REJECTED) {
  const promise2 = new MyPromise((resolve, reject) => {
    // 使用 queueMicrotask
    queueMicrotask(() => {
      try {
        if (typeof onRejected !== 'function') {
          reject(this.reason)
        } else {
          const x = onRejected(this.reason)
          _Resolve(promise2, x, resolve, reject)
        }
      } catch (error) {
        reject(error)
      }
    })
  })
  return promise2
}
if (this.status === PENDING) {
  const promise2 = new MyPromise((resolve, reject) => {
    this.onFulfilledCallbacks.push(() => {
      // 使用 queueMicrotask
      queueMicrotask(() => {
        try {
          if (typeof onFulfilled !== 'function') {
            resolve(this.value)
          } else {
            const x = onFulfilled(this.value)
            _Resolve(promise2, x, resolve, reject)
          }
        } catch (error) {
          reject(error)
        }
        
      })
    })
    this.onRejectedCallbacks.push(() => {
     // 使用 queueMicrotask
      queueMicrotask(() => {
        try {
          if (typeof onRejected !== 'function') {
            reject(this.reason)
          } else {
            const x = onRejected(this.reason)
            _Resolve(promise2, x, resolve, reject)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
  })
  return promise2
}
// ...
```

### 小结
实现 then 方法的过程，我们并没有一步到位将代码实现，结合规范，从参数、异步操作、返回值、执行机制这几个角度，逐步完善我们的代码

```
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
const _Resolve = (promise, x, resolve, reject) => {
  // 如果promise 和 x 引用同一个对象，promise 则以 a TypeError 作为拒因
 if (promise === x) return reject(new TypeError('Chaining cycle detected for promise'))
 // 如果 x 为对象或者函数(x 也有可能是一个 promise 实例)，这里注意使用 typeof 判断 null 的时候 是 object
 if ((typeof x === 'object' || typeof x === 'function') && x !== null) {
   let then
   try {
     // then 赋值 x.then
     then = x.then
   } catch (error) {
     // 如果检索属性 x.then 导致抛出异常，则以 e 拒绝 promise
     return reject(error)
   }
   // 判断 x.then 是否为函数
   if (typeof then === 'function') {
     // 定义isRun 将来判断 resolvePromise 和 rejectPromise 是否调同时调用及多次调用同一个参数
     // 如果是，则第一个调用优先，并且任何进一步的调用都将被忽略
     let isRun = false
     try {
       // 如果then是一个函数，则通过 call 进行调用 并使用 x 作为 this、传入第一个参数resolvePromise 和 第二个参数 rejectPromise
       // resolvePromise 被调用 接受 y，运行[[Resolve]](promise, y)
       const resolvePromise = (y) => {
         if (isRun) return
         isRun = true
         // 运行[[Resolve]](promise, y)
         return _Resolve(promise, y, resolve, reject)
       }
       // rejectPromise 被调用，则以 r 拒绝。promiser
       const rejectPromise = (r) => {
         if (isRun) return
         isRun = true
         // 拒绝。promiser
         reject(r)
       }
       // 使用 x 作为 this， then 调用，并传入 resolvePromise 和 rejectPromise
       then.call(x, resolvePromise, rejectPromise)
     } catch (error) {
       // then抛出异常e
       if (isRun) return
       // 以 e 拒绝 promise
       reject(error)
     }
   } else {
     // 如果then不是函数，则 resolve promise 为 x
     resolve(x)
   }
 } else {
   // 如果 x 不是对象或函数，则 resolve promise 为 x
   resolve(x)
 }
}
class MyPromise {
  constructor(executor) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    // 存储 onFulfilled 和 onRejected 的回调函数数组
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []

    const resolve = value => {
      if (this.status === PENDING) {
        this.status = FULFILLED
        this.value = value
        // 执行 onFulfilledCallbacks 数组中的回调函数
        this.onFulfilledCallbacks.forEach(callback => callback(value))
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {
        this.status = REJECTED
        this.reason = reason
        // 依次执行 onRejectedCallbacks 数组中的回调函数
        this.onRejectedCallbacks.forEach(callback => callback(reason))
      }
    }
    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }
  then(onFulfilled, onRejected) {
    if (this.status === FULFILLED) {
      
      const promise2 = new MyPromise((resolve, reject) => {
        queueMicrotask(() => {
          try {
            if (typeof onFulfilled !== 'function') {
              resolve(this.value)
            } else {
              const x = onFulfilled(this.value)
              _Resolve(promise2, x, resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        })
      })
      return promise2
    }
    if (this.status === REJECTED) {
      const promise2 = new MyPromise((resolve, reject) => {
        queueMicrotask(() => {
          try {
            if (typeof onRejected !== 'function') {
              reject(this.reason)
            } else {
              const x = onRejected(this.reason)
              _Resolve(promise2, x, resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        })
      })
      return promise2
    }
    if (this.status === PENDING) {
      const promise2 = new MyPromise((resolve, reject) => {
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onFulfilled !== 'function') {
                resolve(this.value)
              } else {
                const x = onFulfilled(this.value)
                _Resolve(promise2, x, resolve, reject)
              }
            } catch (error) {
              reject(error)
            }
            
          })
        })
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onRejected !== 'function') {
                reject(this.reason)
              } else {
                const x = onRejected(this.reason)
                _Resolve(promise2, x, resolve, reject)
              }
            } catch (error) {
              reject(error)
            }
          })
        })
      })
      return promise2
    }
  }
  
}
```



## Promise A+ 测试
在完成 then 方法之后就可以进行测试了，这里使用的测试工具是 [promises-aplus-tests](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fpromises-aplus%2Fpromises-tests "https://github.com/promises-aplus/promises-tests")

### 下载依赖
```
yarn add promises-aplus-tests
```
### 配置package.json 执行脚本
```
{
  ...  
  "scripts": {
    "start": "promises-aplus-tests MyPromise"
  }
  ...
}
```
### 暴露 Promise 类
```
// MyPromise.js
...
class MyPromise {...}
module.exports = MyPromise
```
### 为 Promise 类添加一个 deferred 静态方法
> 该方法要返回一个对象，该对象包含 promise, resolve, reject
> 
> `promise`是当前处于待处理状态的承诺
>
> `resolve(value)` 用`value`解决上面那个`promise`
>
> `reject(reason)` 用`reason`拒绝上面那个`promise`
这里为了方便我就直接赋值了
```
...
class MyPromise {...}
MyPromise.deferred = function() {
  var result = {}
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}
module.exports = MyPromise
```
### 通过官方872个测试用例
执行测试
```
yarn run start
```

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8a9ce6e78e3f4df097745277913b327d~tplv-k3u1fbpfcp-watermark.image?)

## 关于 Promise 其他 Api
在 Promise/A+规范中，就只有 then 方法，ES6 中的 Promise 中还有其他Api，其中包括原型上的方法，以及静态方法。
### Promise.prototype.catch
`该方法是为 promise 实例指定失败（拒绝）处理程序`，相当于`.then(null, (error) => {})`语法糖
```
class MyPromise {
  ...
  catch(onRejected) {
    this.then(null, onRejected)
  }
}
```
### Promise.resolve
`调用 Promise.resolve() 将返回一个状态为 fulfilled 的 promise 实例`
```
class MyPromise {
  ...
  static resolve(value) {
    // 如果 value 是一个 Promise 实例，则返回 value
    if (value instanceof MyPromise) return value
    // 如果 value 是一个对象
    if (value instanceof Object) {
      // 如果 value 有 then 方法，则返回 value.then(resolve)
      if (typeof value.then === 'function') {
        return new MyPromise((resolve) => {
          value.then(resolve)
        })
      }
    }
    // 否则返回一个新的 Promise 实例，状态为 FULFILLED，值为 value
    return new MyPromise((resolve) => {
      resolve(value)
    })
  }
}
```
### Promise.reject
`调用Promise.reject()，将返回一个状态为 reject 的 promise 实例`
```
class MyPromise {
  ...
  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason)
    })
  }
}
```
### Promise.all
`用于处理多个 promise 实例，接收一个可迭代对象，最终返回一个新的 promise 实例`
```
class MyPromise {
  ...
  static all(promises) {
    // 判断是否为可迭代对象
    if (typeof promises[Symbol.iterator] !== 'function') {
      throw new TypeError('Argument is not iterable')
    }
    return new MyPromise((resolve, reject) => {
      const result = [] // 存储结果
      const len = promises.length // 可迭代对象的长度
      let count = 0 // 计数器

      // 如果传入的参数是一个空的可迭代对象，返回 []
      if (promises.length === 0) {
        return resolve([])
      }

      for (let i = 0; i < len; i++) {
        const promise = promises[i]
        // 判断参数是否为promise
        if (promise instanceof MyPromise) {
          promise.then(
            value => {
              count ++
              result[i] = value
              count === len && resolve(result)
            },
            reason => {reject(reason)}
          )
        } else {
          // 参数里中非Promise值，原样返回在数组里
          count ++
          result[i] = promise
          count === len && resolve(result)
        }
      }
    })
  }
}
```
### Promise.race
`该方法接收一个可迭代对象，最终返回一个新的 promise 实例，与Promise.all 不同之处便是，不管传入何种状态的 promise 实例，Promise.race 最终只会需要第一个状态发生改变的 promise 实例，并返回一个新的 promise 实例`
```
class MyPromise {
  ...
  static race(promises) {
    // 判断是否为可迭代对象
    if (typeof promises[Symbol.iterator] !== 'function') {
      throw new TypeError('Argument is not iterable')
    }
    return new MyPromise((resolve, reject) => {
      const len = promises.length // 可迭代对象的长度
      for (let i = 0; i < len; i++) {
        const promise = promises[i]
        // 判断参数是否为 promise
        if (promise instanceof MyPromise) {
          promise.then(
            value => {
              resolve(value)
            },
            reason => {
              reject(reason)
            }
          )
        } else {
          // 如果不是promise，直接 resolve
          resolve(promise)
        }
      }
    })
  }
}
```
## 完整代码
```
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
const _Resolve = (promise, x, resolve, reject) => {
  // 如果promise 和 x 引用同一个对象，promise 则以 a TypeError 作为拒因
  if (promise === x) return reject(new TypeError('Chaining cycle detected for promise'))
  // 如果 x 为对象或者函数(x 也有可能是一个 promise 实例)，这里注意使用 typeof 判断 null 的时候 是 object
  if ((typeof x === 'object' || typeof x === 'function') && x !== null) {
    let then
    try {
      // then 赋值 x.then
      then = x.then
    } catch (error) {
      // 如果检索属性 x.then 导致抛出异常，则以 e 拒绝 promise
      return reject(error)
    }
    // 判断 x.then 是否为函数
    if (typeof then === 'function') {
      // 定义isRun 将来判断 resolvePromise 和 rejectPromise 是否调同时调用及多次调用同一个参数
      // 如果是，则第一个调用优先，并且任何进一步的调用都将被忽略
      let isRun = false
      try {
        // 如果then是一个函数，则通过 call 进行调用 并使用 x 作为 this、传入第一个参数resolvePromise 和 第二个参数 rejectPromise
        // resolvePromise 被调用 接受 y，运行[[Resolve]](promise, y)
        const resolvePromise = y => {
          if (isRun) return
          isRun = true
          // 运行[[Resolve]](promise, y)
          return _Resolve(promise, y, resolve, reject)
        }
        // rejectPromise 被调用，则以 r 拒绝。promiser
        const rejectPromise = r => {
          if (isRun) return
          isRun = true
          // 拒绝。promiser
          reject(r)
        }
        // 使用 x 作为 this， then 调用，并传入 resolvePromise 和 rejectPromise
        then.call(x, resolvePromise, rejectPromise)
      } catch (error) {
        // then抛出异常e
        if (isRun) return
        // 以 e 拒绝 promise
        reject(error)
      }
    } else {
      // 如果then不是函数，则 resolve promise 为 x
      resolve(x)
    }
  } else {
    // 如果 x 不是对象或函数，则 resolve promise 为 x
    resolve(x)
  }
}
class MyPromise {
  constructor(executor) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    // 存储 onFulfilled 和 onRejected 的回调函数数组
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []

    const resolve = value => {
      if (this.status === PENDING) {
        this.status = FULFILLED
        this.value = value
        // 执行 onFulfilledCallbacks 数组中的回调函数
        this.onFulfilledCallbacks.forEach(callback => callback(value))
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {
        this.status = REJECTED
        this.reason = reason
        // 依次执行 onRejectedCallbacks 数组中的回调函数
        this.onRejectedCallbacks.forEach(callback => callback(reason))
      }
    }
    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }
  then(onFulfilled, onRejected) {
    if (this.status === FULFILLED) {
      const promise2 = new MyPromise((resolve, reject) => {
        queueMicrotask(() => {
          try {
            if (typeof onFulfilled !== 'function') {
              resolve(this.value)
            } else {
              const x = onFulfilled(this.value)
              _Resolve(promise2, x, resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        })
      })
      return promise2
    }
    if (this.status === REJECTED) {
      const promise2 = new MyPromise((resolve, reject) => {
        queueMicrotask(() => {
          try {
            if (typeof onRejected !== 'function') {
              reject(this.reason)
            } else {
              const x = onRejected(this.reason)
              _Resolve(promise2, x, resolve, reject)
            }
          } catch (error) {
            reject(error)
          }
        })
      })
      return promise2
    }
    if (this.status === PENDING) {
      const promise2 = new MyPromise((resolve, reject) => {
        this.onFulfilledCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onFulfilled !== 'function') {
                resolve(this.value)
              } else {
                const x = onFulfilled(this.value)
                _Resolve(promise2, x, resolve, reject)
              }
            } catch (error) {
              reject(error)
            }
          })
        })
        this.onRejectedCallbacks.push(() => {
          queueMicrotask(() => {
            try {
              if (typeof onRejected !== 'function') {
                reject(this.reason)
              } else {
                const x = onRejected(this.reason)
                _Resolve(promise2, x, resolve, reject)
              }
            } catch (error) {
              reject(error)
            }
          })
        })
      })
      return promise2
    }
  }
  catch(onRejected) {
    return this.then(null, onRejected)
  }
  static resolve(value) {
    // 如果 value 是一个 Promise 实例，则返回 value
    if (value instanceof MyPromise) return value
    // 如果 value 是一个对象或函数
    if (value instanceof Object) {
      // 如果 value 有 then 方法，则返回 value.then(resolve)
      if (typeof value.then === 'function') {
        return new MyPromise(resolve => {
          value.then(resolve)
        })
      }
    }
    // 否则返回一个新的 Promise 实例，状态为 FULFILLED，值为 value
    return new MyPromise(resolve => {
      resolve(value)
    })
  }
  static reject(reason) {
    return new MyPromise((resolve, reject) => {
      reject(reason)
    })
  }
  static all(promises) {
    // 判断是否为可迭代对象
    if (typeof promises[Symbol.iterator] !== 'function') {
      throw new TypeError('Argument is not iterable')
    }
    return new MyPromise((resolve, reject) => {
      const result = [] // 存储结果
      const len = promises.length // 可迭代对象的长度
      let count = 0 // 计数器

      // 如果传入的参数是一个空的可迭代对象，返回 []
      if (promises.length === 0) {
        return resolve([])
      }

      for (let i = 0; i < len; i++) {
        const promise = promises[i]
        // 判断参数是否为promise
        if (promise instanceof MyPromise) {
          promise.then(
            value => {
              count++
              result[i] = value
              count === len && resolve(result)
            },
            reason => {
              reject(reason)
            }
          )
        } else {
          // 参数里中非Promise值，原样返回在数组里
          count++
          result[i] = promise
          count === len && resolve(result)
        }
      }
    })
  }
  static race(promises) {
    // 判断是否为可迭代对象
    if (typeof promises[Symbol.iterator] !== 'function') {
      throw new TypeError('Argument is not iterable')
    }
    return new MyPromise((resolve, reject) => {
      const len = promises.length // 可迭代对象的长度
      for (let i = 0; i < len; i++) {
        const promise = promises[i]
        // 判断参数是否为 promise
        if (promise instanceof MyPromise) {
          promise.then(
            value => {
              resolve(value)
            },
            reason => {
              reject(reason)
            }
          )
        } else {
          // 如果不是promise，直接 resolve
          resolve(promise)
        }
      }
    })
  }
}

MyPromise.deferred = function() {
  var result = {}
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}
module.exports = MyPromise
```
## 最后
如果这篇文章对你有帮助，就点赞和收藏吧，个人能力有限，若有描述不正确地方，请指出，望读者们不喜勿喷