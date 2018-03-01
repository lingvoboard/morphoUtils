'use strict'

const hrstart = process.hrtime()
const fs = require('fs')
const readline = require('readline')

let byteCount = 0
let fileSize = 0

/*

This function (createHashIndex) was borrowed from https://gist.github.com/alexhawkins/48d7fd31af6ed00e5c60
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

function guessEncoding (path) {
  const BOM_0 = 0xff
  const BOM_1 = 0xfe

  try {
    const fd = fs.openSync(path, 'r')
    const bf = Buffer.alloc(2)
    fs.readSync(fd, bf, 0, 2, 0)
    fs.closeSync(fd)
    return bf[0] === BOM_0 && bf[1] === BOM_1 ? 'utf16le' : 'utf8'
  } catch (e) {
    console.error(`Error: ${e.message}.`)
    return null
  }
}

function updateProgressBar () {
  if (!fileSize || !byteCount) return
  const readPercent = Math.ceil(byteCount / fileSize * 100)
  if (readPercent > 100) readPercent = 100
  const barsNumber = Math.floor(readPercent / 2)
  const padsNumber = 50 - barsNumber
  readline.cursorTo(process.stdout, 0)
  readline.clearLine(process.stdout, 0)
  if (readPercent) {
    process.stdout.write(
      `${'█'.repeat(barsNumber)}${' '.repeat(padsNumber)} ${readPercent}%`
    )
  }
}

const tab = Object.create(null)
tab.data = Object.create(null)
const arr1 = []
const arr2 = []
const ignored = []

function readfile (inputfile, encoding) {
  let lineCount = 0
  return new Promise((resolve, reject) => {
    const updater = setInterval(updateProgressBar, 100)
    readline
      .createInterface({
        input: fs.createReadStream(inputfile, encoding),
        terminal: false,
        historySize: 0,
        output: null,
        crlfDelay: Infinity
      })
      .on('line', line => {
        byteCount += Buffer.byteLength(line, encoding) + 1
        lineCount++
        if (lineCount === 1) line = line.replace(/^\uFEFF/, '')

        const arr = line.trim().split('\t')

        if (arr.length === 2) {
          const [word, root] = arr.map(el => {
            return el.trim().toLowerCase()
          })

          if (word && root) {
            if (word !== root && !/\s/.test(word)) {
              if (tab.data[word] === undefined) {
                tab.data[word] = [root]
              } else {
                tab.data[word].push(root)
              }
            } else {
              if (word === root) {
                ignored.push(`=: ${line}`)
              } else {
                ignored.push(`w: ${line}`)
              }
            }
          }
        }
      })
      .on('close', () => {
        clearInterval(updater)
        byteCount = fileSize
        updateProgressBar()
        console.log('\n\n')

        resolve()
      })
      .on('error', err => {
        reject(err)
      })
  })
}

async function main () {
  try {
    fileSize = fs.statSync(process.argv[2])['size']
    const encoding = guessEncoding(process.argv[2])
    console.log('Reading input file:')
    await readfile(process.argv[2], encoding)
    process.stdout.write('Creating database...')

    for (const k in tab.data) {
      const unique = [...new Set(tab.data[k])]
      arr1.push(`${k}\t${unique.join(' ')}`)
    }

    delete tab.data

    arr2.length = arr1.length
    arr2.fill('')

    for (const v of arr1) {
      const i = createHashIndex(v.split('\t')[0], arr1.length)
      arr2[i] = `${arr2[i]}\n${v}`.trim()
    }

    arr1.length = 0
    const arr3 = []
    let offsetAfterHashTable = 0
    let HashTableRowSize = 0

    for (let i = 0; i < arr2.length; i++) {
      if (arr2[i] && arr2[i].length > 0) {
        let s
        if (arr2[i].indexOf('\n') === -1) {
          s = arr2[i].split('\t')[1]
        } else {
          s = arr2[i]
        }

        const buf1 = Buffer.from(s, 'utf8')
        const offset = offsetAfterHashTable
        const length = buf1.byteLength
        offsetAfterHashTable += buf1.byteLength
        arr3.push(s)
        const buf2 = Buffer.from(`${offset}\t${length}`)
        arr2[i] = `${offset}\t${length}`
        if (buf2.byteLength > HashTableRowSize) {
          HashTableRowSize = buf2.byteLength
        }
      } else {
        arr2[i] = ''
      }
    }

    {
      const buf1 = Buffer.from(`${arr2.length.toString()}\t${HashTableRowSize}`)
      const buf2 = Buffer.alloc(64)
      buf1.copy(buf2)
      fs.writeFileSync(process.argv[3], buf2, { flag: 'w' })
    }

    for (const v of arr2) {
      const buf1 = Buffer.alloc(HashTableRowSize)
      const buf2 = Buffer.from(v, 'utf8')
      buf2.copy(buf1)
      fs.writeFileSync(process.argv[3], buf1, { flag: 'a' })
    }

    const count = arr2.length
    arr2.length = 0

    for (let v of arr3) {
      const buf = Buffer.from(v, 'utf8')
      fs.writeFileSync(process.argv[3], buf, { flag: 'a' })
    }

    let pre = ''
    if (ignored.length > 0)
      pre = `Legend:\n= - left part is equal to right part\nw - not allowed whitespace\n__________\n\n`

    fs.writeFileSync('ignored.txt', pre, { encoding: 'utf8', flag: 'w' })

    for (let v of ignored) {
      fs.writeFileSync('ignored.txt', v + '\n', { encoding: 'utf8', flag: 'a' })
    }

    process.stdout.write('\rCreating database... Done\n')

    console.log('Added: ' + count)
    console.log('Ignored: ' + ignored.length)

    const hrend = process.hrtime(hrstart)
    console.log(
      `\n\nExecution time: ${hrend[0]}.${Math.floor(hrend[1] / 1000000)}\n`
    )

    process.stdout.write('Memory Usage: ')
    console.log(process.memoryUsage().rss / 1024 / 1024)
  } catch (err) {
    console.log(err)
  }
}

if (process.argv.length === 4 || fileExists(process.argv[2])) {
  main()
} else {
  console.log('Invalid command line.')
  process.exit()
}
