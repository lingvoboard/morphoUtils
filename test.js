'use strict'

const morphodb = require('./morphoDBengine.js')

try {
  {
    const word = 'honden'
    console.time('test1')
    const baseform = morphodb.getBaseForm('morpho_nl.data', word)

    console.log(`${word} => ${baseform}`)
    console.timeEnd('test1')
  }

  console.log()

  {
    const word = 'vraagt'
    console.time('test2')
    const baseform = morphodb.getBaseForm('morpho_nl.data', word)

    console.log(`${word} => ${baseform}`)
    console.timeEnd('test2')
  }

  console.log()

  {
    const word = 'afknabbelt'
    console.time('test3')
    const baseform = morphodb.getBaseForm('morpho_nl.data', word)

    console.log(`${word} => ${baseform}`)
    console.timeEnd('test3')
  }
} catch (e) {
  console.log(e)
}
