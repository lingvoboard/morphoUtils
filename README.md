morphoUtils
==========

morphoDBcreator.js - Node.js script for creating database.

morphoDBengine.js - Node.js module for accessing database.


## Usage

### Database creation

```
Command line:
node morphoDBcreator.js morpho_nl.txt morpho_nl.data

Output:
morpho_nl.data
ignored.txt

```
![Screenshot1:](https://s10.postimg.org/cwd472q4p/Screenshot_2018-02-28_21-49-04.png)

### Accessing database

```
Command line:
node test.js

Output:
honden => hond
test1: 4.723ms

zygoten => zygoot zygote
test2: 0.234ms

afknabbelt => afknabbelen
test3: 0.126ms

```
