/* Copyright (c) 2013 Gordon Williams, Pur3 Ltd. See the file LICENSE for copying permission. */
/*
Module for the HD44780 controller in text-based LCDs (pretty much all 16x2 and 20x4 LCDs)

If you have one of the LCDs with an I2C backpack, just use:

```
I2C1.setup({scl:B6, sda:B7});
var lcd = require("HD44780").connectI2C(I2C1);
lcd.print("Hello World!");
```

Otherwise try:

```
var lcd = require("HD44780").connect(A4,A5,A0,A1,A2,A3);
lcd.print("Hello World!");
```
*/

function HD44780(write) {
  // initialise
  write(0x33,1); // init into 4-bit mode, see datasheet fig 24
  write(0x32,1);
  write(0x2C,1); // 4-bit mode, 2 lines, font A02
  write(0x0C,1); // disp ON, no cursor, no blink
  write(0x06,1); // increment mode, no shift
  write(0x01,1); // clear display
  // add functions
  return {
    write : write,
    // clear screen
    clear : function() { write(0x01,1); },
    // print text
    print : function(str) {
      var i=0, l=str.length, c;
      while(l--) write(str.charCodeAt(i++));
    },
    // flashing block for the current cursor, or underline
    cursor : function(block) { write(block?0x0F:0x0E,1); },
    // set cursor pos, top left = 0,0
    setCursor : function(x,y) { var l=[0x00,0x40,0x14,0x54];write(0x80|(l[y]+x),1); },
    // set special character 0..7, data is an array(8) of bytes, and then return to home addr
    createChar : function(ch, data) {
      write(0x40 | ((ch&7) << 3), 1);
      for (var i=0; i<8; i++) write(data[i]);
      write(0x80,1);
    }
  };
}

//exports.connectI2C = function(/*=I2C*/_i2c) {
//  var i2c = _i2c;
//  var write = function(x, c) {
//    var a = (x&0xF0) |8| ((c===undefined)?1:0);
//    var b = ((x<<4)&0xF0) |8| ((c===undefined)?1:0);
//    i2c.writeTo(0x27, [a,a,a|4,a|4,a,a,b,b,b|4,b|4,b,b]);
//  };
//  return new HD44780(write);
//};

exports.connectMCP23008 = function(mcp) {
  var w = mcp.write.bind(mcp);
  //var d = mcp.writeNibble.bind(mcp);
  var m = mcp.writeMask.bind(mcp);
  var rs = 4
  var en = 6;

  // initialize
  m(0xff, [0xF3]);
  for(var i=0; i<8; i++) mcp.mode(i,'output');
  w(rs, 1);
  w(en, 0);
  w(rs, 0);

  var write = function(x, c) {
    var rs = c?0:0x10,
        en = 0x40,
        x1 = (x>>4)&0x0F,
        x2 = (x&0x0F);
    m(0x5F, [rs, rs+en+x1, rs+x1, rs+en+x2, rs+x2]);
  }
  return new HD44780(write);
}

//exports.connect = function(/*=PIN*/_rs,/*=PIN*/_en,/*=PIN*/_d4,/*=PIN*/_d5,/*=PIN*/_d6,/*=PIN*/_d7) {
//  var data = [_d7,_d6,_d5,_d4];
//  var rs = _rs;
//  var en = _en;
//  digitalWrite(rs, 1);
//  digitalWrite([rs,en], 0);
//  var write = function(x, c) {
//    digitalWrite(rs, !c);
//    digitalWrite(data, x>>4);
//    digitalWrite(en, 1);
//    digitalWrite(en, 0);
//    digitalWrite(data, x);
//    digitalWrite(en, 1);
//    digitalWrite(en, 0);
//  };
//  return new HD44780(write);
//};
