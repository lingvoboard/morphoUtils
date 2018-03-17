'use strict'

const fs = require('fs')
const zlib = require('zlib')

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

function shuffle (arr) {
  var j, x, i
  for (i = arr.length; i; i--) {
    j = Math.floor(Math.random() * i)
    x = arr[i - 1]
    arr[i - 1] = arr[j]
    arr[j] = x
  }
}

function readrangesSync (indexfile, word) {
  word = word.trim().toLowerCase()

  const buf1 = Buffer.alloc(64)

  const fd = fs.openSync(indexfile, 'r')
  fs.readSync(fd, buf1, 0, 64, 0)

  const [index_max, HashTableRowSize, data_max] = buf1
    .toString()
    .split('\t')
    .map(el => {
      return parseInt(el)
    })

  const index = createHashIndex(word.toLowerCase(), data_max)
  let range = Math.floor(index / 100)

  if (range > index_max) return undefined

  const index_offset = range ? HashTableRowSize * range + 64 : 64
  const buf = Buffer.alloc(HashTableRowSize)
  fs.readSync(fd, buf, 0, HashTableRowSize, index_offset)
  const [offset, length] = buf
    .toString()
    .split(',')
    .map(el => parseInt(el))

  fs.closeSync(fd)

  return { offset: offset, length: length, index: index }
}

function getblockSync (blocks_file, offset, length, encoding = 'utf8') {
  const fd = fs.openSync(blocks_file, 'r')
  const buf = Buffer.alloc(length)
  fs.readSync(fd, buf, 0, length, offset)
  fs.closeSync(fd)
  const inflated = zlib.inflateRawSync(buf, {
    finishFlush: zlib.constants.Z_SYNC_FLUSH
  })
  return inflated.toString(encoding)
}

function getblock (blocks_file, offset, length, encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    fs.open(blocks_file, 'r', (err, fd) => {
      if (err) reject(err)

      const buf1 = Buffer.alloc(length)

      fs.read(fd, buf1, 0, length, offset, (err, bytesRead, buf2) => {
        if (err) reject(err)

        fs.close(fd, err => {
          if (err) reject(err)

          zlib.inflateRaw(
            buf2,
            { finishFlush: zlib.constants.Z_SYNC_FLUSH },
            (err, inflated) => {
              if (err) reject(err)

              resolve(inflated.toString(encoding))
            }
          )
        })
      })
    })
  })
}

function readranges (ranges_file, word) {
  return new Promise((resolve, reject) => {
    word = word.trim().toLowerCase()

    fs.open(ranges_file, 'r', (err, fd) => {
      if (err) reject(err)

      const buf1 = Buffer.alloc(64)

      fs.read(fd, buf1, 0, 64, 0, (err, bytesRead, buf2) => {
        if (err) reject(err)

        process(buf2, fd)
      })
    })

    function process (buf1, fd) {
      const [ranges_max, HashTableRowSize, blocks_max] = buf1
        .toString()
        .split('\t')
        .map(el => {
          return parseInt(el)
        })

      const index = createHashIndex(word.toLowerCase(), blocks_max)
      const range = Math.floor(index / 100)

      if (range > ranges_max) reject({ message: 'Out of Range' })

      const ranges_offset = range ? HashTableRowSize * range + 64 : 64
      const buf2 = Buffer.alloc(HashTableRowSize)

      fs.read(
        fd,
        buf2,
        0,
        HashTableRowSize,
        ranges_offset,
        (err, bytesRead, buf3) => {
          if (err) reject(err)

          const [offset, length] = buf3
            .toString()
            .split(',')
            .map(el => parseInt(el))

          fs.close(fd, err => {
            if (err) reject(err)

            resolve({ offset: offset, length: length, index: index })
          })
        }
      )
    }
  })
}

function getdata (ranges_file, blocks_file, word, dicinfo) {
  return new Promise((resolve, reject) => {
    if (!ranges_file || !blocks_file || !word) resolve({ data: [] })

    readranges(ranges_file, word)
      .then(ranges_data => {
        getblock(blocks_file, ranges_data.offset, ranges_data.length)
          .then(block => {
            const arr = block.split('\x00')

            const cell = arr[ranges_data.index % 100].split('\n')

            let res = []

            for (const v of cell) {
              const r = v.split('\r').map(el => {
                const arr = el.split('\t')
                if (arr.length === 3) {
                  return `${arr[1]}\t${arr[2]}`
                } else {
                  return el
                }
              })

              for (const v of r) {
                let [a, b] = v.split('\t')
                if (a.toLowerCase() === word.toLowerCase()) {
                  res.push(b)
                }
              }
            }

            resolve({ data: res, word: word, dicinfo: dicinfo })
          })
          .catch(err => {
            console.log(err)
            resolve({ data: [] })
          })
      })
      .catch(err => {
        console.log(err)
        resolve({ data: [] })
      })
  })
}

function getdataSync (ranges_file, blocks_file, word, dicinfo) {
  if (!ranges_file || !blocks_file || !word) return undefined

  let ranges_data = readrangesSync(ranges_file, word)

  if (!ranges_data) return undefined

  let block = getblockSync(blocks_file, ranges_data.offset, ranges_data.length)

  const arr = block.split('\x00')

  const cell = arr[ranges_data.index % 100].split('\n')

  let res = []

  for (const v of cell) {
    const r = v.split('\r').map(el => {
      const arr = el.split('\t')
      if (arr.length === 3) {
        return `${arr[1]}\t${arr[2]}`
      } else {
        return el
      }
    })

    for (const v of r) {
      let [a, b] = v.split('\t')
      if (a.toLowerCase() === word.toLowerCase()) {
        res.push(b)
      }
    }
  }

  return { data: res, word: word, dicinfo: dicinfo }
}

function getRandomData (ranges_file, blocks_file, dicinfo) {
  return new Promise((resolve, reject) => {
    if (!ranges_file || !blocks_file) resolve({ data: [] })

    fs.open(ranges_file, 'r', (err, fd) => {
      if (err) {
        console.log(err)
        resolve({ data: [] })
      }

      const buf1 = Buffer.alloc(64)

      fs.read(fd, buf1, 0, 64, 0, (err, bytesRead, buf2) => {
        if (err) {
          console.log(err)
          resolve({ data: [] })
        }

        process1(buf2, fd)
      })
    })

    function process1 (buf1, fd) {
      const [ranges_max, HashTableRowSize, blocks_max] = buf1
        .toString()
        .split('\t')
        .map(el => {
          return parseInt(el)
        })

      const range = Math.floor(Math.random() * ranges_max)
      const ranges_offset = range ? HashTableRowSize * range + 64 : 64
      const buf2 = Buffer.alloc(HashTableRowSize)

      fs.read(
        fd,
        buf2,
        0,
        HashTableRowSize,
        ranges_offset,
        (err, bytesRead, buf3) => {
          if (err) {
            console.log(err)
            resolve({ data: [] })
          }

          const [offset, length] = buf3
            .toString()
            .split(',')
            .map(el => parseInt(el))

          fs.close(fd, err => {
            if (err) {
              console.log(err)
              resolve({ data: [] })
            }

            process2({ offset: offset, length: length })
          })
        }
      )
    }

    function process2 (ranges_data) {
      getblock(blocks_file, ranges_data.offset, ranges_data.length)
        .then(block => {
          const arr = block.split('\x00')

          shuffle(arr)

          for (const v of arr) {
            if (v !== '') {
              var cell = v.split('\n')
              break
            }
          }

          if (!cell) {
            console.log('Empty block')
            resolve({ data: [] })
          }

          shuffle(cell)

          let res = []

          for (const v of cell) {
            const r = v.split('\r').map(el => {
              const arr = el.split('\t')
              if (arr.length === 3) {
                return `${arr[1]}\t${arr[2]}`
              } else {
                return el
              }
            })

            for (const v of r) {
              res.push(v)
            }
          }

          shuffle(res)
          const [word, artinfo] = res[0].split('\t')

          resolve({ data: [artinfo], word: word, dicinfo: dicinfo })
        })
        .catch(err => {
          console.log(err)
          resolve({ data: [] })
        })
    }
  })
}

module.exports = {
  getdata: getdata,
  getdataSync: getdataSync,
  getRandomData: getRandomData
}
