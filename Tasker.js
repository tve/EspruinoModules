// Copyright 2015 by Thorsten von Eicken

// Tasker - kind of a 'Purposed' Promise
// From: http://forum.espruino.com/conversations/261352/
// allows retries, resumes when all task are completed with
// either ok or error function depending on the tasks results
// Helpful for sequence agnostic setup of multiple interdependent 
// 'things' that require resume callbacks, for example:
// Setup of multiple communication devices, display, GPS, etc.
// When all successfully setup and ready, the application code
// as placed in/passed as the ok() function will resume.
// Task is a function that gets passed a done function and a try cnt.
// On successfull completion, task calls done with true (in callback).
// On failure, it calls done with false and optional number of tries.
// ok and err functions get number of successfully passed tasks (oks)
// and arrays of statutes (sts, true/false), actual tries, and tasks.
// Tasker is invoked with array of tasks, ok and err function (and
// optional boolean for logging:
// Tasker.new([t0Fnct,t1Fnct,t2Fnct,...],ok­Fnct,errFnct,lg);
// Tasker can be made fatter/leaner by adding statistics about
// start, end, and execution times / removing log, oks, and tries
exports.tasker = (function(){
  var T = function(tasks,ok,err,lg) {
    this.tasks = tasks; 
    this.ok = (ok) ? ok : function(){};
    this.err = (err) ? err : function(){};
    this.cnt = 0; this.sts = []; this.tries = []; this.lg = lg;
    tasks.forEach(function(t,id){ this._do(this,t,id,1); },this);
  };
  T.prototype._do = function(_this,t,id,n) {
    if (this.lg) console.log("Task "+id+" kickoff "+n);
    var done = function(ok,tries){ _this.done(ok,id,n,tries); };
    this.tries[id] = n; setTimeout(function(){ t(done,n); },1); 
  },
  T.prototype.done = function(ok,id,n,tries) {
    if (this.lg) console.log("Task "+id+" try "+n+" ok: "+ok);
    this.cnt++; if (!(this.sts[id] = ok) && tries && (tries > n)) { 
      this.cnt--; this._do(this,this.tasks[id],id,n + 1); }
    if (this.cnt === this.tasks.length) {
      var oks = this.sts.filter(function(o){ return o; }).length;
      var sts = this.sts, _tries = this.tries, _tasks = this.tasks;
      this.sts = null; this.tries = null; this.tasks = null;
      this[(oks == this.cnt) ? "ok" : "err"](oks,sts,tries,tasks); 
    }
  };
  return T;
})();

