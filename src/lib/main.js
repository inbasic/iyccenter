var tabs             = require("sdk/tabs"),
    self             = require("sdk/self"),
    data             = self.data,
    {Cc, Ci, Cu, Cr} = require('chrome'),
    pageMod          = require("sdk/page-mod"),
    Request          = require("sdk/request").Request,
    _                = require("sdk/l10n").get,
    timer            = require("sdk/timers"),
    panel            = require("sdk/panel"),
    tabs             = require("sdk/tabs"),
    sp               = require("sdk/simple-prefs"),
    prefs            = sp.prefs,
    http             = require("./http"),
    userstyles       = require("./userstyles"),
    storage          = require('./storage'),
    c                = require("./config").configs,
    windows          = {
      get active () { // Chrome window
        return require('sdk/window/utils').getMostRecentBrowserWindow();
      }
    }
    isAustralis   = "gCustomizeMode" in windows.active,
    toolbarbutton = isAustralis ? require("toolbarbutton/new") : require("toolbarbutton/old");

/** Libraries **/
Cu.import("resource://gre/modules/Promise.jsm");
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

/** Loading styles **/
userstyles.load(data.url("overlay.css"));

/** Debugger **/
function debug () {
  console.error.apply(this, arguments);
}

/** Permanent injections **/
var workers = (function () {
  var cache = [];
  return {
    attach: function (worker) {
      worker.id = -1;
      worker.state = -1;
      cache.push(worker);
    },
    detach: function (worker) {
      var i = cache.indexOf(worker);
      if (i !== -1) cache.splice(i, 1);
      button.update(cache.map(c => c.state));
    },
    update: function (worker, id, state) {
      var i = cache.indexOf(worker);
      if (i !== -1) {
        cache[i].id = id;
        if (state) cache[i].state = state;
        if (state === 1) mp.offset = 0;
        mp.update();
        button.update(cache.map(c => c.state));
      }
    },
    get: () => cache
  }
})();
pageMod.PageMod({
  include: ["*.youtube.com"],
  contentScriptOptions: {prefs: prefs},
  contentScriptFile: data.url("start.js"),
  contentScriptWhen: "ready"
});

pageMod.PageMod({
  include: ["*.youtube.com"],
  contentScriptFile: data.url("end.js"),
  contentScriptOptions: {prefs: prefs},
  contentScriptWhen: "start",
  attachTo: ["existing", "top"],
  onAttach: function(worker) {
    workers.attach(worker);
    worker.on("detach", () => workers.detach(worker));
    worker.port.emit("options", worker.tab.options);
    worker.port.on("info", function(o) {
      if (!o.id) return;
      workers.update(worker, o.id, -1); //-1: unstarted
      storage.insert(o.id, o.title, o.duration).then();
    });
    worker.port.on("onStateChange", function (id, state) {
      workers.update(worker, id, state);
      if (prefs.onePlayer && state === 1) {
        workers.get().filter((w) => (w.state === 1 && w.id !== id ? true : false))
          .forEach((w) =>  w.port.emit("pause"));
      }
      if (prefs.loop && state === 0) {
        workers.get().filter((w) => w.id === id ? true : false).forEach(function (w) {
          timer.setTimeout((w) => w.port.emit("play"), prefs.loopDelay * 1000, w);
        });
      }
    });
  }
});
/** Toolbar Panel **/
var mp = panel.Panel({
  width: c.panel.width,
  height: c.panel.height,
  contentURL: data.url('player/mp.html'),
  contentScriptFile: data.url('player/mp.js')
});
mp.update = function(offset) {
  if (!mp.isShowing) return;
  if (offset == "p" || offset == "n") {
    mp.offset += (offset === "p" ? 1 : -1) * c.panel.numbers;
  }
  storage.read(c.panel.numbers + 1, mp.offset).then(
    function (objs) {
      var isNext = objs.length == c.panel.numbers + 1;
      if (isNext) objs.pop();
      objs.forEach(
        (o, i) => objs[i].state = workers.get().reduce((p, c) => c.id === o.id && (p === -1 || p === null) ? c.state : p, null)
      );
      mp.port.emit("update", objs, mp.offset > 0, isNext);
    },
    debug
  );
}
mp.offset = 0;
mp.on("show", mp.update);
mp.port.on("update", mp.update);
mp.port.on("search", function (q) {
  Promise.all([storage.search(q, c.search.sql, workers.get()), search(q, c.panel.numbers)]).then(
    ([arr1, arr2]) => mp.port.emit("search", arr1.concat(arr2.splice(0, c.panel.numbers - arr1.length))),
    debug
  );
});

function pauseAll() workers.get().forEach((w) => w.port.emit("pause"));
mp.port.on("pause-all", pauseAll);
mp.port.on("stop-all", function () {
  workers.get().forEach((w) => w.port.emit("stop"));
});
function play (id) {  //id === -1 to play an open tab
  var worker = workers.get().reduce((p, c) => p || (c && c.id === id ? c : null), null);
  if (id === -1) worker = workers.get().filter(w => w.id !== -1).shift();
  if (worker) return worker.port.emit("play");
  for each (var tab in tabs) {
    if(/youtube\.com\/watch\?v\=/.test(tab.url) && id && id !== -1) {
      tab.options = {autoplay: true};
      return tab.attach({
        contentScript: 'window.location.replace("watch?v=' + id + '&autoplay=1");'
      });
    }
  }
  tabs.open({
    url: id && id !== -1 ? c.play.url + id + "&autoplay=1": c.play.def,
  });
}
mp.port.on("play", play);
mp.port.on("pause", function (id) {
  var worker = workers.get().reduce((p, c) => p || (c && c.id == id ? c : null), null);
  if (worker) worker.port.emit("pause");
});
mp.port.on("volume", function (v) {
  var volume = prefs.volume;
  prefs.volume += (v === "p" && volume <= 90 ? 10 : 0) - (v === "n" && volume >= 10 ? 10 : 0);
  workers.get().forEach((w) => w.port.emit("volume", prefs.volume));
  notify(_("msg1") + " " + prefs.volume + "%");
});
function skip () {
  var worker = workers.get().filter(w => w.state === 1).forEach(w => w.port.emit("skip"))
}
mp.port.on("skip", skip);
mp.port.on("kill", function (id) {
  storage.kill(id).then(mp.update);
  var tab = workers.get().reduce((p, c) => p || (c && c.id == id ? c.tab : null), null);
  if (tab) tab.close();
});
mp.port.on("settings", function () {
  windows.active.BrowserOpenAddonsMgr("addons://detail/" + self.id);
  mp.hide();
});
/** Toolbar Button **/
button = toolbarbutton.ToolbarButton({
  id: c.toolbar.id,
  label: _("toolbar"),
  tooltiptext: _("tooltip"),
  panel: mp,
  onCommand: (e, tbb) => mp.show(tbb),
  onClick: function (e, tbb) {
    if (e.button != 1) return;
    e.stopPropagation();
    e.preventDefault();
    switch (prefs.middle) {
      case 1:  return mp.show(tbb);
      case 2:  return pauseAll();
      case 3:  return play(-1);
      case 4:  return skip();
    }
  },
  onContext: function (e, tbb) {
    if (prefs.context) {
      e.stopPropagation();
      e.preventDefault();
    }
    switch (prefs.context) {
      case 1:  return mp.show(tbb);
      case 2:  return pauseAll();
      case 3:  return play(-1);
      case 4:  return skip();
    }
  }
});
button.update = function (states) {
  button.state = states.reduce((p, c) =>  (c === 1 ? c : null) || p || (c === 2 ? c : null), null);
}
/** YouTube Search **/
function search (q, num) {
  var d = new Promise.defer();
  if (q) {
    Request({
      url: c.search.url.replace("%q", q),
      onComplete: function (r) {
        try {
          r.json.feed
        }
        catch (e) {
          return d.reject(Error(_("err2")));
        }
        d.resolve((r.json.feed.entry || []).splice(0, num).map(function (i) {
          var id = (/videos\/([^&\/]+)/.exec(i.id.$t) || [null,null])[1];
          return {
            id: id,
            duration: i.media$group.yt$duration.seconds,
            title: i.title.$t,
            state: workers.get().reduce((p, c) => c.id == id ? c.state : p, null),
            type: "internet"
          };
        }));
      }
    }).get();
  }
  else {
    d.resolve([]);
  }
  return d.promise;
}
/** Load and Unload **/
exports.main = function(options, callbacks) {
  if (options.loadReason == "install" || prefs.forceVisible) {
    button.moveTo(c.toolbar.move);
  }
  //Welcome
  if (options.loadReason == "upgrade" || options.loadReason == "install") {
    prefs.newVer = options.loadReason;

/*    timer.setTimeout(function () {
      for each (var tab in tabs) {
        if(/youtube\.com\/watch\?v\=/.test(tab.url)) tab.reload();
      }
    }, 1000);*/
  }
  if (options.loadReason == "startup" || options.loadReason == "install") {
    welcome();
  }
}
exports.onUnload = function (reason) {
  if (prefs.killOnExit) {
    storage.killall().then(storage.release);
  }
  else {
    storage.release();
  }
}

/** Options **/
sp.on("clearLog", function () {
  if (!windows.active.confirm(_("msg2"))) return;
  storage.killall().then( () => notify(_("msg3")));
});

/** Welcome page **/
function welcome () {
  if (!prefs.newVer) return;
  timer.setTimeout(function () {
    tabs.open({
      url:  c.extension.url + "?v=" + self.version + "&type=" + prefs.newVer,
      inBackground : false
    });
    prefs.newVer = "";
  }, c.extension.time);
}

/** Notifier **/
var notify = (function () {
  return function (msg) {
    try {
      let alertServ = Cc["@mozilla.org/alerts-service;1"].
                      getService(Ci.nsIAlertsService);
      alertServ.showAlertNotification(data.url("notification.png"), _("name"), msg);
    }
    catch (e) {
      let browser = windows.active.gBrowser,
          notificationBox = browser.getNotificationBox();

      notification = notificationBox.appendNotification(
        msg,
        'jetpack-notification-box',
        data.url("notification.png"),
        notificationBox.PRIORITY_INFO_MEDIUM,
        []
      );
      timer.setTimeout(function() {
        notification.close();
      }, 3000);
    }
  }
})();
