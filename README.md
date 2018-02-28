morphoUtils
==========

morphoDBcreator.js - Node.js script for creating database.
morhoDBengine.js - Node.js module for accessing database.


## Usage

### Database creation

```
Command line:
node morphoDBcreator.js morpho_nl.txt morpho_nl.data

Output:
morpho_nl.data
ignored.txt

```

### Accessing database

```
Command line:
node test.js

Output:
honden => hond
test1: 4.091ms

vraagt => vragen
test2: 0.198ms

afknabbelt => afknabbelen
test3: 0.135ms

```
