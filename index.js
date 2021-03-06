function PersistentQueue(callback_error, callback_successed, callback_thisArg) {
  var queue = [];
  var self = this;
  var aborted = false;
  var executing = false;
  var ptr = -1;
  var len = 0;

  this.add = function(callback) {
    queue.push(callback);
    len = queue.length;
    ptr++;
  };

  function abort(error, args) {
    aborted = true;
    while(ptr < len) ptr++;

    if(error)
      callback_error.apply(callback_thisArg, args);
    else
      callback_successed.apply(callback_thisArg, args);
  }

  this.error = function() {
    abort(true, arguments);
  };

  this.escape = function() {
    abort(false, arguments);
  };

  function step(args) {
    if(ptr == len-1) {
      callback_successed.apply(callback_thisArg, args);
      ptr++;
    }
    else {      
      ptr++;    
      queue[ptr].apply(self, args);
    }
  }

  this.deliver = function() {
    step(arguments);
  };

  this.execute = function() {
    ptr=-1;
    step(arguments);
  };
}

function Queue(callback_error, callback_successed, callback_thisArg) {
  var queue = [];
  var self = this;
  var aborted = false;
  var executing = false;

  this.add = function(callback) {
    if(executing)
      throw new Error("The Queue already executed");
    queue.push(callback);
  };

  this.append = function(callback) {
    if(!executing)
      throw new Error("The Queue not executed");
    queue.push(callback);
  };

  function abort(error, args) {
    aborted = true;
    while(queue.length > 0)
      queue.shift();
    if(error)
      callback_error.apply(callback_thisArg, args);
    else
      callback_successed.apply(callback_thisArg, args);
  }

  this.error = function() {
    abort(true, arguments);
  };

  this.escape = function() {
    abort(false, arguments);
  };

  function step(args) {
    if(queue.length < 1)
      callback_successed.apply(callback_thisArg, args);
    else
      queue.shift().apply(self, args);
  }

  this.deliver = function() {
    step(arguments);
  };

  this.execute = function() {
    if(executing)
      throw new Error("The Queue already executed");
    executing = true;
    step(arguments);
  };
};

module.exports.createQueue = function(callback_error, callback_successed, callback_thisArg) {
  return new Queue(callback_error, callback_successed, callback_thisArg);
};

function ConcurrentQueue(callback_done, callback_thisArg) {
  var array = [];
  var results = [];
  var completed = 0;
  var executing = false;

  function checkAndProcessDone() {
    ++ completed;
    if(completed >= array.length) {
      callback_done.apply(callback_thisArg, [results]);
    }
  }

  this.createQueue = function(key) {
    if(executing)
      throw new Error("The QueueArray already executed");
    var result = {key: key, error: null, successed: null};
    var queue = new Queue(function() {
      result.error = arguments;
      checkAndProcessDone();
    }, function() {
      result.successed = arguments;
      checkAndProcessDone();
    });
    array.push(queue);
    results.push(result);
    return queue;
  };

  this.execute = function() {
    if(executing)
      throw new Error("The QueueArray already executed");
    executing = true;
    if(array.length < 1)
      callback_done.apply(callback_thisArg, [results]);
    else {
      for(var i = 0; i < array.length; ++i)
	array[i].execute();
    }
  };
}

module.exports.createConcurrentQueue = function(callback_done, callback_thisArg) {
  return new ConcurrentQueue(callback_done, callback_thisArg);
};
