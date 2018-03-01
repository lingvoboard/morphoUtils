'use strict'

const fs = require('fs')

/*

This function (createHashIndex) was borrrowed from https://gist.github.com/alexhawkins/48d7fd31af6ed00e5c60
Thanks to alexhawkins 

*/
function createHashIndex (key, max) {
  let hash = 0

  for (var i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash = hash >>> 0 // convert to 32bit unsigned integer
  }

  return Math.abs(hash % max)
}

function getBaseForm (inputfile, word) {
  if (!inputfile || !word) return undefined

  word = word.trim().toLowerCase()

  let res

  const buf = Buffer.alloc(64)

  const fd = fs.openSync(inputfile, 'r')
  fs.readSync(fd, buf, 0, 64, 0)

  const [max, HashTableRowSize] = buf
    .toString()
    .split('\t')
    .map(el => {
      return parseInt(el)
    })
  const HashTableEnd = 64 + HashTableRowSize * max

  const i = createHashIndex(word, max)
  const HashTableOffset = i * HashTableRowSize + 64

  {
    const buf = Buffer.alloc(HashTableRowSize)
    fs.readSync(fd, buf, 0, HashTableRowSize, HashTableOffset)
    var [offsetAfterHashTable, len] = buf
      .toString()
      .split('\t')
      .map(el => {
        return parseInt(el)
      })
    var offset = HashTableEnd + offsetAfterHashTable
  }

  {
    const buf = Buffer.alloc(len)
    fs.readSync(fd, buf, 0, len, offset)
    fs.closeSync(fd)
    const arr = buf.toString().split('\n')

    if (arr.length === 1) {
      res = arr[0]
    } else {
      for (const v of arr) {
        const [a, b] = v.split('\t')
        if (a === word) {
          res = b
          break
        }
      }
    }
  }

  return res
}

module.exports = {
  getBaseForm: getBaseForm
}
