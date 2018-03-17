'use strict'

const db = require('./morphoDBengine.js')

;(async () => {

  try {
    
    /************************/
    {
      const word = 'honden'
      console.time('test1')
      const baseforms = db.getdataSync('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat', word)

      console.log(`${word} => ${baseforms.data.join(', ')}`)
      console.timeEnd('test1')
    }
    /************************/
    {
      const word = 'zygoten'
      console.time('test2')
      const baseforms = await db.getdata('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat', word)

      console.log(`\n${word} => ${baseforms.data.join(', ')}`)
      console.timeEnd('test2')
    }
    /************************/
    {
      const word = 'afknabbelt'
      console.time('test3')
      const baseforms = db.getdataSync('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat', word)

      console.log(`\n${word} => ${baseforms.data.join(', ')}`)
      console.timeEnd('test3')
    }
    /************************/
    {
      console.time('test4')
      const res = await db.getRandomData('morpho_nl.ranges.dat', 'morpho_nl.blocks.dat')
      
      console.log()
      console.log(res)
      console.timeEnd('test4')
    }
    /************************/
    
  } catch(e) {
    console.log(e.message)
  }


})() 
