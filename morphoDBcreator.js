'use strict'

const hrstart = process.hrtime()
const fs = require('fs')
const readline = require('readline')
const zlib = require('zlib')
const path = require('path')

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

        const arr = line.trim().split('\t').map(el => el.trim()).filter(Boolean)

        if (arr.length === 2) {
          
          const [word, data] = arr
          const key = word.toLowerCase()

          if (tab.data[key] === undefined) {
            tab.data[key] = `${word}\t${data}`
          } else {
            tab.data[key] += `\r${word}\t${data}`
          }

        } else {
          ignored.push(`Line ${lineCount}: ${line}`)
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
      const unique = [...new Set(tab.data[k].split('\r'))]
      arr1.push(`${k}\t${unique.join('\r')}`)
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
    const arr4 = []  

    let offset = 0

    const res = path.parse(process.argv[2])
    const ranges_file = `${res.name}.ranges.dat`
    const blocks_file = `${res.name}.blocks.dat`

    fs.writeFileSync(blocks_file, '', { flag: 'w' })

    for (let i = 0; i < arr2.length; i++) {

        arr3.push(arr2[i])

        if (arr3.length === 100) {

          const buf1 = zlib.deflateRawSync(arr3.join('\x00'))
          fs.writeFileSync(blocks_file, buf1, { flag: 'a' })
          const length = buf1.byteLength
          arr3.length = 0
          arr4.push(`${offset},${length}`)

          offset += length
        }
    
    }

    if (arr3.length > 0) {

        const buf1 = zlib.deflateRawSync(arr3.join('\x00'))
        fs.writeFileSync(blocks_file, buf1, { flag: 'a' })
        const length = buf1.byteLength
        arr3.length = 0
        arr4.push(`${offset},${length}`)

    }
    

    let HashTableRowSize = 0

    for (const v of arr4) {
      const buf = Buffer.from(v, 'utf8')
      if (buf.byteLength > HashTableRowSize) {
        HashTableRowSize = buf.byteLength
      }
    }

    {
      const buf1 = Buffer.from(`${arr4.length}\t${HashTableRowSize}\t${arr2.length.toString()}`)
      const buf2 = Buffer.alloc(64)
      buf1.copy(buf2)
      fs.writeFileSync(ranges_file, buf2, { flag: 'w' })
    }


    for (const v of arr4) {
      const buf1 = Buffer.alloc(HashTableRowSize)
      const buf2 = Buffer.from(v, 'utf8')
      buf2.copy(buf1)
      fs.writeFileSync(ranges_file, buf1, { flag: 'a' })
    }

    const count = arr2.length
    arr2.length = 0

    if (ignored.length > 0) {
      fs.writeFileSync('ignored.txt', '', { encoding: 'utf8', flag: 'w' })
    } else {
      try {
        fs.unlinkSync('ignored.txt')
      } catch(e) {

      }
    }

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

if (process.argv.length === 3 || fileExists(process.argv[2])) {
  main()
} else {
  console.log('Invalid command line.')
  process.exit()
}

