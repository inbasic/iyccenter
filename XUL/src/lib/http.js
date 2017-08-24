/**/
'use strict';

var unload       = require('sdk/system/unload'),
    sp           = require('sdk/simple-prefs'),
    prefs        = sp.prefs;
//
var {WebRequest} = require('resource://gre/modules/WebRequest.jsm');
var {MatchPattern} = require('resource://gre/modules/MatchPattern.jsm');

// autoplay next track
var playlist = {
  isInstalled: false,
  listen: function (e) {
    if (e.url.endsWith('watch_autoplayrenderer.js')) {
      return {cancel: true};
    }
  },
  install: () => {
    if (!playlist.isInstalled) {
      WebRequest.onBeforeRequest.addListener(playlist.listen,
        {
          urls: new MatchPattern([
            'http://s.ytimg.com/yts/jsbin/*',
            'https://s.ytimg.com/yts/jsbin/*'
          ])
        },
        ['blocking']
      );
      playlist.isInstalled = true;
    }
  },
  uninstall: () => {
    if (playlist.isInstalled) {
      WebRequest.onBeforeRequest.removeListener(playlist.listen);
      playlist.isInstalled = false;
    }
  }
};
unload.when(playlist.uninstall);
if (!prefs.playlist) {
  playlist.install();
}
sp.on('playlist', () => {
  playlist[prefs.playlist ? 'uninstall' : 'install']();
});
// autoplay embedded
var autoplay = {
  isInstalled: false,
  listen: function (e) {
    if (e.url.indexOf('autoplay=1') !== -1) {
      return {
        redirectUrl: e.url.replace('autoplay=1', 'autoplay=0')
      };
    }
  },
  install: () => {
    if (!autoplay.isInstalled) {
      WebRequest.onBeforeSendHeaders.addListener(autoplay.listen,
        {
          urls: new MatchPattern([
            'http://www.youtube.com/embed/*',
            'https://www.youtube.com/embed/*'
          ])
        },
        ['blocking']
      );
      autoplay.isInstalled = true;
    }
  },
  uninstall: () => {
    if (autoplay.isInstalled) {
      WebRequest.onBeforeSendHeaders.removeListener(autoplay.listen);
      autoplay.isInstalled = false;
    }
  }
};
unload.when(autoplay.uninstall);
if (!prefs.autoplay) {
  autoplay.install();
}
sp.on('autoplay', () => {
  autoplay[prefs.autoplay ? 'uninstall' : 'install']();
});
