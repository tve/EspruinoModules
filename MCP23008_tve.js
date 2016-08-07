/* Copyright (c) 2015 Spence Konde, Pur3 Ltd. See the file LICENSE for copying permission. */
/* See MCP23xxx.md for more info */
exports.connect = function(i2c,rst,i2ca) {
    return new MCP23008(i2c,rst,i2ca);
};
function MCP23008(i2c,rst, i2ca) {
  if (rst) {
    rst.write(0);
  }
  this.i2c = i2c;
  this.i2ca = (i2ca===undefined) ? 32:32+i2ca;
  this.wt = i2c.writeTo.bind(i2c, this.i2ca);
  if (rst) {
      this.rst=rst;
      this.rst.write(1);
  }
  this.n=255;
  this.pu=0;
  this.olat=0;
/*
  this.A0=new PEP(1,this);
  this.A1=new PEP(2,this);
  this.A2=new PEP(4,this);
  this.A3=new PEP(8,this);
  this.A4=new PEP(16,this);
  this.A5=new PEP(32,this);
  this.A6=new PEP(64,this);
  this.A7=new PEP(128,this);
*/
}

var _p = MCP23008.prototype;
//_p.s=function(r,d){this.i2c.writeTo(this.i2ca,r,d);};
//_p.s=function(r,d){D5.write(1);this.i2c.writeTo(this.i2ca,r,d);D5.write(0);};
_p.s=function(r,d){this.wt(r,d);};
_p.r=function(r){this.i2c.writeTo(this.i2ca,r);return this.i2c.readFrom(this.i2ca,1);};
_p.m=function(bv,mode) {
  if (["input","output","input_pullup"].indexOf(mode)<0) throw "Pin mode "+mode+" not available";
  this.s(0,mode=='output'?(this.n&=~bv):(this.n |=bv));
  this.s(6,mode=='input_pullup'?(this.pu|=bv):(this.pu&=~bv));
};

_p.write=function(pin,val) {
    var bv=1<<pin;
    this.olat&=~bv;
    this.wt(9,this.olat|=(bv*!!val));
    //console.log("MCP:",pin,"=",val,",",this.olat);
};

_p.writeNibble=function(val) {
    var o=(this.olat & 0x0F0) | (val & 0x0F);
    this.wt(9,o);
    this.olat = o;
}

_p.writeMask=function(mask,vals) {
    var v, l, i=0,
        o = this.olat & ~mask,
        wt = this.wt;
    //D5.write(0);
    while((v=vals[i++])!=undefined) {
      l = o|(v&mask);
      wt(9,l);
    }
    //D5.write(1);
    this.olat = l;
    /*
    while ((v=vals.shift())!=undefined) {
      l = o|(v&mask);
      wt(9,l);
    }
    D5.write(1);
    this.olat = l;
   */
}

//_p.writePort=function(val) {
//    this.olat=val;
//    this.s(9,this.olat);
//};

_p.mode=function(pin,mode) {this.m(1<<pin,mode);};

//_p.pin = function(i) {
//  return new PEP(1<<i, this);
//};

//_p.read=function(pin) {
//    return (this.r(9)[0]&(1<<pin))>>pin;
//};

//_p.readPort=function() {
//    return (this.r(9)[0]);
//};

/*
function PEP (b,p){
    this.b=b;
    this.p=p;
}

_p = PEP.prototype;
_p.set=function(){this.p.s(9,this.p.olat|=this.b);};
_p.reset=function(){this.p.s(9,this.p.olat&=~(this.b));};
_p.write=function(v){this.p.s(9,(v?this.p.olat|=this.b:this.p.olat&=~(this.b)));};
_p.read=function(){return (this.p.r(9)[0]&this.b)?1:0;};
_p.mode=function(m){this.p.m(this.b,m);};
*/
