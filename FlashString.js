/*
 * FlashString.js - Flash memory manager for JavaScript strings
 * Thorsten von Eicken 2016
 * MIT License
 *
 * Stores strings indexed by name in flash, one string per flash page. This is targeted at the
 * esp8266 where each flash page is 4KB. This means that each string consumes 4KB and its length
 * is limited to 4KB minus the length of the name minus 4 bytes.
 * Load the FlashString module using `FS=require('FlashString')`, then write a string using
 * `FS.save(name, str)` and restore it using `str = FS.load(name)`. Writing a string with the
 * same name again overwrites the earlier one. To delete a string use `FS.erase(name)` and to
 * delete all use `FS.eraseAll()`.
 * When "restoring" a string the load() function returns a memoryArea, i.e. a string that
 * points directly into the bytes in flash, so only a couple of JSvars are used to hold the
 * name of the javascript string variable. However, if you change the flash location the string
 * will change too...
 * Esp8266 modules with 512KB flash are not currently supported (too little free flash). Esp8266
 * with 1MB flash can store 5 flash strings and esp8266 with more flash can store 9 strings.
 * The primary intended purpose of the FlashString module is to save javascript modules to flash
 * and execute them from flash. For this purpose, use the save() function to write each module
 * indexed by its name to flash. Then at boot time, load all the flash modules using the
 * FlashLoader's loadAll function, which is under 500 bytes in size. The FlashString module
 * itself uses approx 1KB minified but is not needed to load all modules at boot.
 */

var FL = require("Flash");
var FR = FL.getFree()[2]; // 3rd area has biggest chunk under 1MB
var FB = FR.addr;         // start of flash save area (0xf7000)
var FS = 0x1000;          // esp8266 flash page size
var FN = FR.length / FS;  // number of flash pages
var FO = 0x40200000;      // offset from flash address to its memory-mapped location

// copy string into a Uint8Array rounded up to a multiple of 4 in length
function s2a(str) {
  while (str.length & 3) str += " ";
  return E.toUint8Array(str);
}

// find flash page for a string by name, returns the flash page address.
// If the name is not found and free==1 it returns a free flash page addr, else it returns 0
function findName(name, free) {
  // iterate through flash pages to see whether there's a match
  var f = 0;
  for (var i=0; i<FN; i++) {
    var addr = FB+i*FS;
    //console.log("Checking", i, addr.toString(16));
    // read index at start of page with name length and code text length
    var ix = FL.read(4, addr);
    var nameLen = ix[0]<<2;
    var codeLen = ix[1]<<4;
    // see whether page is unused
    if (ix[2] != 0xA5 || ix[3] != 0xC3) {
      //console.log("  free at", addr.toString(16));
      f = addr;
      continue;
    }
    // see whether the name length differs
    if (nameLen !== name.length) continue;
    // read the name
    var fName = FL.read(nameLen, addr+4);
    if (fName == name) {
      //console.log("  found at", addr.toString(16));
      return addr;
    }
  }
  return free ? f : 0;
}

// save() writes the text into a flash location tagged with the name. If
// a string of the same name is already stored in flash it gets replaced.
exports.save = function(name, text) {
  // copy the module name into a Uint8Array rounded up to a multiple of 4 in length
  var nameArr = s2a(name), nal = nameArr.length;
  if (nal+((text.length+15)&0xffc0)+4 > FS) throw("too big");
  // iterate through flash pages to see whether there's a match
  var addr = findName(nameArr, 1);
  if (!addr) throw("no space");
  //console.log("write at", addr.toString(16));
  // erase page, then write header, then write name
  FL.erasePage(addr);
  FL.write(E.toUint8Array([nal >> 2, (text.length+15) >> 4, 0xA5, 0xC3]), addr);
  FL.write(nameArr, addr+4);
  // write text in small chunks to avoid copying the whole thing
  //console.log("write", (addr+4+nal).toString(16), text.length, (text.length+15) >> 4);
  for (var i=0; i<text.length; i+=16) {
    var sub = text.substr(i, 16);
    while (sub.length < 16) sub += " ";
    var buf = E.toUint8Array(sub);
    //if (i+16 >= text.length) console.log("wr", (addr+4+nal+i).toString(16), sub);
    FL.write(buf, addr+4+nal+i);
  }
}

// load() retrieves a string by name or null if not found. The retrieved string is kept in
// flash, i.e., it's a string created by E.memoryArea.
exports.load = function(name) {
  // copy the module name into a Uint8Array rounded up to a multiple of 4 in length
  var nameArr = s2a(name), nal = nameArr.length;
  // iterate through flash pages to see whether there's a match
  var addr = findName(nameArr, 0);
  if (!addr) return null;
  // read length
  var ix = FL.read(4, addr);
  // address and length of code
  var codeAddr = addr+4+(ix[0]<<2);
  var codeLen  = ix[1]<<4;
  // return memory area
  //console.log("  memoryArea", codeAddr.toString(16), codeLen);
  return E.memoryArea(FO+codeAddr, codeLen);
}

// erase() erases a string by name. Warning: if any variable points to the string it will be wiped
// out!
exports.erase = function(name) {
  // copy the module name into a Uint8Array rounded up to a multiple of 4 in length
  var nameArr = s2a(name), nal = nameArr.length;
  // iterate through flash pages to see whether there's a match
  var addr = findName(nameArr, 0);
  // erase the flash page
  if (addr) FL.erasePage(addr);
}

// eraseAll() erases all strings. Warning: if any variable points to any string it will be wiped
// out!
exports.eraseAll = function() {
  // loop through pages and erase each one
  for (var i=0; i<FN; i++)
    FL.erasePage(FB+i*FS);
}

