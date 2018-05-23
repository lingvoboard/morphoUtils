morphoUtils
==========

morphoDBcreator.js - Node.js script for creating database.

morphoDBengine.js - Node.js module for accessing database.


## Usage

### Database creation

```
Command line:
node morphoDBcreator.js morpho_nl.txt

Output:
morpho_nl.blocks.dat
morpho_nl.ranges.dat

```

### Accessing database

```
Command line:
node test.js

Output:
honden => hond
test1: 6.515ms

zygoten => zygoot, zygote
test2: 10.397ms

afknabbelt => afknabbelen
test3: 0.463ms

{ data: [ 'klassiek' ], word: 'klassiekst', dicinfo: undefined }
test4: 6.257ms

```
<hr>
