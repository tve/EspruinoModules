/* Copyright (c) 2016 Thorsten von Eicken
 * Based on initial version by HyGy.
 * See the file LICENSE for copying permission.
 */

/*
This is a basic nextion hmi lcd handling module. Tested with NX3224T028_011R  2.8”      320*240 LCD.
http://wiki.iteadstudio.com/Nextion_HMI_Solution
*/

function Nextion(port) {
  this.port = port;   // serial port being used
  this.cmd = [];      // command accumulated so far
  this.endCnt = 0;  // number of end-command bytes received
  this.port.on('data', this.recv.bind(this));
}

/** 'public' constants here */
Nextion.prototype.C = {};

Nextion.prototype.p = function(txt) {
  //console.log("Nextion send:", txt);
  this.port.print(txt + '\xff\xff\xff');
};

function j() { return arguments.join(','); }

/** Set the given page */
Nextion.prototype.setPage = function(id) { this.p('page ' + id); };

/** Get the named variable */
Nextion.prototype.get = function(name) { this.p('get ' + name); };

/** Get the current page */
//Nextion.prototype.sendme = function() { this.p('sendme'); }

/** Refresh the component by id */
Nextion.prototype.refresh = function(id) { this.p('ref '+id); }

/** Enter touch calibration */
//Nextion.prototype.touch_j = function() { this.p('touch_j'); }

/** Hide/show component */
//Nextion.prototype.show = function(name, on) { this.p('vis ' + j(name, (on?"1":"0"))); }

/** Enable component touch function */
//Nextion.prototype.enable = function(name, on) { this.p('tsw ' + j(name, (on?"1":"0"))); }

/** Convert a variable type*/
//Nextion.prototype.cov = function(att1, att2, length) { this.p('cov ' + j(att1, att2, length)); }

/** Set a variable */
Nextion.prototype.setVal = function(varName, newVal) {
  // new Val is string then send as string if number then send as number
  if (typeof(newVal)=='string') {
    this.p(varName + '="' + newVal + '"');
  } else {
    this.p(varName + '=' + newVal);
  }
}

/** Display a picture */
//Nextion.prototype.pic = function(x, y, pic) { this.p('pic ' + j(x, y, pic)); }

/** Display a picture crop */
//Nextion.prototype.piccrop = function(x, y, w, h, pic) { this.p('picq ' + j(x, y, w, h, pic)); }

/** Display text */
Nextion.prototype.text = function(x, y, w, h, fontId, fontFg, fontBg, xAlign, yAlign, style, str) {
  this.p('xstr ' + j(x, y, w, h, fontId, fontFg, fontBg, xAlign, yAlign, style, '"'+str+'"'));
}

/** Internal function to parse a received command */
Nextion.prototype.parse = function(cmd) {
  //console.log('Nextion parse', cmd);
  if (cmd[0] < 0x20) {
    console.log("Nextion error", cmd[0].toString(16));
    //this.emit('error', cmd[0]);
    return;
  }

  switch (cmd[0]) {

    /*
    case 0x65: // touch event
      console.log('touch event');
      this.emit('touch',
        cmd[1], // pageId
        cmd[2], // componentId
        cmd[3] === 0x0 ? 'release' : 'press' // touchEvent press: 0x01, release 0x00
      );
      break;
    */

    case 0x66: // Current page ID
      console.log("page", cmd[1]);
      this.emit('page', cmd[1]);
      break;

    case 0x70: // String variable data returns
      cmd.shift();
      cmd = E.toString(cmd);
      //console.log('Nextion str:', cmd);
      this.emit('string', cmd);
      break;

    /*
    case 0x71: // Numeric data returns
      var num = cmd[1] + (cmd[2] << 8) + (cmd[3] << 16) + (cmd << 24);
      console.log('Nextion num:', num);
      this.emit('number', num);
      break;
    */

    default:
      console.log('Nextion: ??' + cmd[0].toString(16));
  }

};

/** Internal function to receive a bunch of characters */
Nextion.prototype.recv = function(data) {
  //console.log("Nextion recv", data.length);
  for (var i=0; i<data.length; i++) {
    var c = data.charCodeAt(i);
    if (c == 0xFF) {
      this.endCnt++;
      if (this.endCnt == 3) {
        this.endCnt = 0;
        this.parse(this.cmd);
        this.cmd = [];
      }
    } else {
      this.endCnt = 0;
      this.cmd.push(c);
    }
  }
};

/** Create the interface for a nextion display attached to the specified serial port, such as
 * Serial1. Typical usage:
 * `Serial1.setBaud = 115200; var disp = require('Nextion').connect(Serial1);`.
 */
exports.connect = function(port) {
  return new Nextion(port);
}

