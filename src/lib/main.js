'use strict';

var tabs             = require('sdk/tabs'),
    self             = require('sdk/self'),
    data             = self.data,
    {Cc, Ci}         = require('chrome'),
    {all, defer}     = require('sdk/core/promise'),
    notifications    = require('sdk/notifications'),
    pageMod          = require('sdk/page-mod'),
    Request          = require('sdk/request').Request,
    _                = require('sdk/l10n').get,
    timer            = require('sdk/timers'),
    panel            = require('sdk/panel'),
    tabs             = require('sdk/tabs'),
    sp               = require('sdk/simple-prefs'),
    prefs            = sp.prefs,
    http             = require('./http'), // jshint ignore:line
    userstyles       = require('./userstyles'),
    storage          = require('./storage'),
    c                = require('./config').configs,
    windows          = {
      get active () { // Chrome window
        return require('sdk/window/utils').getMostRecentBrowserWindow();
      }
    },
    isAustralis   = 'gCustomizeMode' in windows.active,
    toolbarbutton = require(isAustralis ? './toolbarbutton/new' : './toolbarbutton/old');

/** Loading styles **/
userstyles.load(data.url('overlay.css'));

/** Debugger **/
function debug (a, b, c) {
  console.error(a, b, c);
}

var mp, button;

/** Notifier **/
var notify = (text) => {
  if (prefs.silent) {
    return;
  }
  notifications.notify({
    title: 'YouTube Control Center',
    text,
    iconURL: self.data.url('notification.png')
  });
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
      if (i !== -1) {
        cache.splice(i, 1);
      }
      button.update(cache.map(c => c.state));
    },
    update: function (worker, id, state) {
      var i = cache.indexOf(worker);
      if (i !== -1) {
        cache[i].id = id;
        if (state) {
          cache[i].state = state;
        }
        if (state === 1) {
          mp.offset = 0;
        }
        mp.update();
        button.update(cache.map(c => c.state));
      }
    },
    get: () => cache
  };
})();

pageMod.PageMod({
  include: ['*.youtube.com'],
  contentScriptFile: data.url('end.js'),
  contentScriptWhen: 'start',
  attachTo: ['existing', 'top'],
  onAttach: function(worker) {
    workers.attach(worker);
    worker.port.emit('prefs', prefs);
    worker.on('detach', () => workers.detach(worker));
    worker.port.emit('options', worker.tab.options);
    worker.port.on('info', function(o) {
      if (!o.id) {
        return;
      }
      workers.update(worker, o.id, -1); //-1: unstarted
      storage.insert(o.id, o.title, o.duration).then();
    });
    worker.port.on('onStateChange', function (id, state) {
      workers.update(worker, id, state);
      if (prefs.onePlayer && state === 1) {
        workers.get().filter((w) => (w.state === 1 && w.id !== id ? true : false))
          .forEach((w) =>  w.port.emit('pause'));
      }
      if (prefs.loop && state === 0) {
        workers.get().filter((w) => w.id === id ? true : false).forEach(function (w) {
          timer.setTimeout((w) => w.port.emit('play'), prefs.loopDelay * 1000, w);
        });
      }
    });
  }
});

/** Toolbar Panel **/
mp = panel.Panel({
  width: c.panel.width,
  height: c.panel.height,
  contentURL: data.url('player/mp.html'),
  contentScriptFile: data.url('player/mp.js')
});
mp.update = function(offset) {
  if (!mp.isShowing) {
    return;
  }
  if (offset === 'p' || offset === 'n') {
    mp.offset += (offset === 'p' ? 1 : -1) * c.panel.numbers;
  }
  storage.read(c.panel.numbers + 1, mp.offset).then(
    function (objs) {
      var isNext = objs.length === c.panel.numbers + 1;
      if (isNext) {
        objs.pop();
      }
      objs.forEach(
        (o, i) => objs[i].state = workers.get().reduce((p, c) => c.id === o.id && (p === -1 || p === null) ? c.state : p, null)
      );
      mp.port.emit('update', objs, mp.offset > 0, isNext);
    },
    debug
  );
};
mp.offset = 0;
mp.on('show', mp.update);
mp.port.on('update', mp.update);
mp.port.on('search', function (q) {
  all([storage.search(q, c.search.sql, workers.get()), search(q, c.panel.numbers)]).then(
    ([arr1, arr2]) => mp.port.emit('search', arr1.concat(arr2.splice(0, c.panel.numbers - arr1.length))),
    debug
  );
});

function pauseAll () {
  return workers.get().forEach((w) => w.port.emit('pause'));
}
mp.port.on('pause-all', pauseAll);
mp.port.on('stop-all', function () {
  workers.get().forEach((w) => w.port.emit('stop'));
});
function play (id) {  //id === -1 to play an open tab
  var worker = workers.get().reduce((p, c) => p || (c && c.id === id ? c : null), null);
  if (id === -1) {
    worker = workers.get().filter(w => w.id !== -1).shift();
  }
  if (worker) {
    return worker.port.emit('play');
  }
  for each (var tab in tabs) {
    if(/youtube\.com\/watch\?v\=/.test(tab.url) && id && id !== -1) {
      tab.options = {autoplay: true};
      return tab.attach({
        contentScript: 'window.location.replace("watch?v=' + id + '&autoplay=1");'
      });
    }
  }
  tabs.open({
    url: id && id !== -1 ? c.play.url + id + '&autoplay=1': c.play.def,
  });
}
mp.port.on('play', play);
mp.port.on('pause', function (id) {
  var worker = workers.get().reduce((p, c) => p || (c && c.id === id ? c : null), null);
  if (worker) {
    worker.port.emit('pause');
  }
});
mp.port.on('volume', function (v) {
  var volume = prefs.volume;
  prefs.volume += (v === 'p' && volume <= 90 ? 10 : 0) - (v === 'n' && volume >= 10 ? 10 : 0);
  workers.get().forEach((w) => w.port.emit('volume', prefs.volume));
  notify(_('msg1') + ' ' + prefs.volume + '%');
});
function skip () {
  workers.get().filter(w => w.state === 1).forEach(w => w.port.emit('skip'));
}
mp.port.on('skip', skip);
mp.port.on('kill', function (id) {
  storage.kill(id).then(mp.update);
  var tab = workers.get().reduce((p, c) => p || (c && c.id === id ? c.tab : null), null);
  if (tab) {
    tab.close();
  }
});
mp.port.on('settings', function () {
  windows.active.BrowserOpenAddonsMgr('addons://detail/' + self.id);
  mp.hide();
});
mp.port.on('prefs', function (obj) {
  if (obj.value === null) {
    mp.port.emit('prefs', {
      name: obj.name,
      value: prefs[obj.name]
    });
  }
  else {
    prefs[obj.name] = obj.value;
  }
});
sp.on('autoplay', () => {
  mp.port.emit('prefs', {
    name: 'autoplay',
    value: prefs.autoplay
  });
});
sp.on('loop', () => {
  mp.port.emit('prefs', {
    name: 'loop',
    value: prefs.loop
  });
});

/** Toolbar Button **/
button = toolbarbutton.ToolbarButton({
  id: c.toolbar.id,
  label: _('toolbar'),
  tooltiptext: _('tooltip'),
  panel: mp,
  onCommand: (e, tbb) => mp.show(tbb),
  onClick: function (e, tbb) {
    if (e.button !== 1) {
      return;
    }
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
};
/** YouTube Search **/
function search (q, num) {
  var d = defer();
  if (q) {
    new Request({
      url: c.search.url.replace('%q', q),
      headers: {
        Referer: 'https://www.youtube.com/'
      },
      onComplete: function (r) {
        d.resolve((r.json && r.json.items ? r.json.items : []).splice(0, num).map(function (i) {
          let id = i.id.videoId;
          return {
            id,
            duration: 0,
            title: i.snippet.title,
            state: workers.get().reduce((p, c) => c.id === id ? c.state : p, null),
            type: 'internet'
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
exports.main = function(options) {
  if (options.loadReason === 'install' || prefs.forceVisible) {
    button.moveTo(c.toolbar.move);
  }
  //Welcome
  if (options.loadReason === 'upgrade' || options.loadReason === 'install') {
    prefs.newVer = options.loadReason;

/*    timer.setTimeout(function () {
      for each (var tab in tabs) {
        if(/youtube\.com\/watch\?v\=/.test(tab.url)) tab.reload();
      }
    }, 1000);*/
  }
  if (options.loadReason === 'startup' || options.loadReason === 'install') {
    welcome();
  }
};
exports.onUnload = function () {
  if (prefs.killOnExit) {
    storage.killall().then(storage.release);
  }
  else {
    storage.release();
  }
};

/** Options **/
sp.on('reset', function () {
  let pservice = Cc['@mozilla.org/preferences-service;1'].
    getService(Ci.nsIPrefService).
    getBranch('extensions.jid1-CikLKKPVkw6ipw@jetpack.');
  pservice.getChildList('',{})
    .filter(n => n !== 'version' && n.indexOf('sdk') === -1)
    .forEach(n => pservice.clearUserPref(n));
});
sp.on('clearLog', function () {
  if (!windows.active.confirm(_('msg2'))) {
    return;
  }
  storage.killall().then( () => notify(_('msg3')));
});
sp.on('autofshow', function () {
  if (prefs.autofshow) {
    prefs.autohide = false;
    prefs.controls = true;
  }
});
sp.on('autohide', function () {
  if (prefs.autohide) {
    prefs.autofshow = false;
  }
});
sp.on('playlist', function () {
  if (prefs.playlist) {
    prefs.autoplay = true;
    prefs.rel = true;
  }
});
sp.on('rel', function () {
  if (!prefs.rel) {
    prefs.playlist = false;
  }
});

/** Welcome page **/
function welcome () {
  if (!prefs.newVer) {
    return;
  }
  timer.setTimeout(function () {
    tabs.open({
      url:  c.extension.url + '?v=' + self.version + '&type=' + prefs.newVer,
      inBackground : false
    });
    prefs.newVer = '';
  }, c.extension.time);
}
