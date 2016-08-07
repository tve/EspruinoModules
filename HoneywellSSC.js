// Copyright (c) 2015 Thorsten von Eicken. See the file LICENSE for copying permission.

/*
 * This module reads pressure and temperature from Honeywell SSC Series digital I2C pressure
 * sensors. For each sensor the module needs to be initialized with the minimum and maximum pressure
 * supported by the sensor.
 * The formulas come from the Honeywell Technical Note "I2C Communications with Honeywell Digital
 * Output Pressure Sensors".
 */

// values returned by the sensor that indicate min and max of the sensor's designed range
var C = {
  pr_out_min :  1638, // 10% of 2^14
  pr_out_max : 14746, // 90% of 2^14
};

function HoneywellSSC(i2c, min_pressure, max_pressure) {
  this.i2c = i2c;
  this.pr_min = min_pressure;
  this.pr_max = max_pressure;
}

/** 'public' constants */
HoneywellSSC.prototype.C = {
  addr : 0x28, //< default i2c address
};

/** getPressure returns a tuple with the pressure and the temperature in degrees celsius. The units
 *  for the pressure depend on the sensor: either in mbar, bar, or psi. If the sensor cannot be
 *  read or is not ready it raises an exception. */
HoneywellSSC.prototype.getPressure = function() {
  // read 4 bytes from the sensor, this may throw an exception
  var data = this.i2c.readFrom(this.C.addr, 4);
  // check returned status bits
  if ((data[0]>>6) !== 0) throw "HoneywellSSC not ready";
  // calculate pressure
  var pr = ((data[0]&0x3f)<<8) | data[1];
  //console.log(this.pr_min, this.pr_max, C.pr_out_min, C.pr_out_max, pr);
  pr = (pr - C.pr_out_min)*(this.pr_max - this.pr_min);
  pr = pr / (C.pr_out_max - C.pr_out_min);
  pr += this.pr_min;
  // calculate temperature
  var t = (data[2]<<3) | (data[3]>>5);
  t = (t/2047*200)-50;
  return [pr, t];
};

/** Create the interface for the pressure sensor. Initialize the I2C interface using something like
 *  `I2C1.setup(D12, D13)`. Then `require('HoneywellSSC.js').connect(I2C1, pr_min, pr_max)` where
 *  pr_min and pr_max are the minimum and maximum of the pressure range of the sensor. */
exports.connect = function(i2c, pr_min, pr_max) {
  return new HoneywellSSC(i2c, pr_min, pr_max);
};
