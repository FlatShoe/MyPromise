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

MyPromise.deferred = function () {
  var result = {}
  result.promise = new MyPromise(function (resolve, reject) {
    result.resolve = resolve
    result.reject = reject
  })
  return result
}
module.exports = MyPromise
