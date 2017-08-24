var _            = require("sdk/l10n").get,
    {Cc, Ci, Cu} = require('chrome'); 

Cu.import("resource://gre/modules/Promise.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
if (!Promise.all) { //Support for FF 24.0
  Promise = (function () {
    var obj = {};
    for (var prop in Promise) {
       if(Promise.hasOwnProperty(prop)) {
          obj[prop] = Promise[prop];
       }
    }
    obj.all = function (arr) {
      var d = new Promise.defer(), results = [], stage = arr.length;
      function next (succeed, i, result) {
        results[i] = result;
        stage -= 1;
        if (!succeed) d.reject(result);
        if (!stage) d.resolve(results);
      }
      arr.forEach((e, i) => e.then(next.bind(this, true, i), next.bind(this,false, i)));
      return d.promise;
    }
    Object.freeze(obj);
    return obj;
  })();
}

var dbConn;
function exec (index) {
  if (!dbConn) {
    dbConn = Services.storage.openDatabase(
      FileUtils.getFile("ProfD", ["youtube-control-center", "storage.sqlite"])
    );
  }
  var s = [
    "CREATE TABLE IF NOT EXISTS list(" + 
    "  id CHAR(40) PRIMARY KEY NOT NULL," +
    "  title TEXT NOT NULL," +
    "  duration INTEGER NOT NULL," +
    "  count INTEGER DEFAULT 0," +
    "  time TIMESTAMP default (datetime('now', 'localtime'))" +
    ");",
    "INSERT OR IGNORE INTO list (id, title, duration) VALUES(?1, ?2, ?3);",
    "UPDATE list SET count = count + 1, time = DATETIME('now', 'localtime') WHERE id = ?1 AND time < DATETIME('now', 'localtime', '-1 Minute');",
    "SELECT * FROM list ORDER BY time DESC LIMIT ?1 OFFSET ?2",
    "DELETE FROM list WHERE id = ?1",
    "DELETE FROM list",
    "SELECT * FROM list WHERE title LIKE ?1 AND title LIKE ?2 AND title LIKE ?3 AND title LIKE ?4 AND title LIKE ?5 AND title LIKE ?6 ORDER BY time DESC LIMIT ?7"
  ];

  var d = new Promise.defer();
  var statement = dbConn.createStatement(s[index]);
  [].slice.call(arguments, 1).forEach((arg, i) => statement.bindUTF8StringParameter(i, arg));
  statement.executeAsync({
    handleResult: d.resolve,  //returns result set
    handleError: d.reject,
    handleCompletion: function(reason) {
      if (reason != Ci.mozIStorageStatementCallback.REASON_FINISHED) {
        return d.reject(Error(_("err1")));
      }
      d.resolve();
    }
  });
  return d.promise;
}

exports.insert = function (id, title, duration) {
  return Promise.all([exec(0), exec(1, id, title, duration), exec(2, id)]);
}

exports.kill = function (id) {
  return Promise.all([exec(0), exec(4, id)]);
}

exports.killall = function (id) {
  return Promise.all([exec(0), exec(5)]);
}

exports.search = function (q, num, workers) {
  var d = new Promise.defer();
  
  q = q.replace(/\s{2,}/g, " ").split(" ").reverse().splice(0, 6);
  var searches = [6].concat(Array(6).join(" ").split(" ").map((s,i)=> "%" + (q[i] || "") + "%")).concat(num);
  
  Promise.all([exec(0), exec.apply(this, searches)]).then(function ([r0, set]) {
    var tmp = [];
    if (set) {
      for (var row; row = set.getNextRow();) {
        tmp.push({
          id: row.getResultByName("id"),
          title: row.getResultByName("title"),
          duration: row.getResultByName("duration"),
          count: row.getResultByName("count"),
          time: row.getResultByName("time"),
          type: "history",
          state: workers.reduce((p, c) => c.id === row.getResultByName("id") ? c.state : p, null)
        });
      }
    }
    d.resolve(tmp);
  }, d.reject);
  return d.promise; 
}

exports.read = function (num, offset) { //Maximum number of columns to read
  var d = new Promise.defer();
  Promise.all([exec(0), exec(3, num, offset)]).then(function ([r0, set]) {
    var tmp = [];
    if (set) {
      for (var row; row = set.getNextRow();) {
        tmp.push({
          id: row.getResultByName("id"),
          title: row.getResultByName("title"),
          duration: row.getResultByName("duration"),
          count: row.getResultByName("count"),
          time: row.getResultByName("time")
        });
      }
    }
    d.resolve(tmp);
  }, d.reject);
  return d.promise; 
}

exports.release = function () {
  if (!dbConn) return;
  dbConn.mozIStorageConnection.asyncClose({
      complete: function() {}
  });
}