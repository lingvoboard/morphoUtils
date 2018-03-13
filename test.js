'use strict'

const db = require('./morphoDBengine.js')

;(async () => {

  try {
    

    {
      const word = 'honden'
      console.time('test1')
      const baseforms = db.getdataSync('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat', word)

      console.log(`${word} => ${baseforms.data.join(', ')}`)
      console.timeEnd('test1')
    }

    console.log()

    {
      const word = 'zygoten'
      console.time('test2')
      const baseforms = await db.getdata('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat', word)

      console.log(`${word} => ${baseforms.data.join(', ')}`)
      console.timeEnd('test2')
    }

    console.log()

    {
      const word = 'afknabbelt'
      console.time('test3')
      const baseforms = db.getdataSync('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat', word)

      console.log(`${word} => ${baseforms.data.join(', ')}`)
      console.timeEnd('test3')
    }
    
    
  } catch(e) {
    console.log(e.message)
  }


})() 
