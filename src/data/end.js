/* globals XPCNativeWrapper, exportFunction, unsafeWindow, self */
'use strict';

var player;
var prefs;
// styling
self.port.on('prefs', (prefs) => {
  let css = '' +
  (prefs.sidebar ? '' : '#watch7-sidebar {display: none;}') +
  (prefs.discussion ? '' : '#watch-discussion {display: none;}') +
  (prefs.views ? '' : '#watch7-views-info {display: none;}') +
  (prefs.actions ? '' : '#watch8-secondary-actions {display: none;}') +
  (!prefs.views && !prefs.actions ? '#watch8-action-buttons {display: none;}' : '') +
  (prefs.details ? '' : '#action-panel-details {display: none;}') +
  (prefs.header ? '' : '#masthead-positioner-height-offset, #masthead-positioner {display: none;}') +
  (prefs.playlist ? '' : '.autoplay-bar {opacity: 0.3;}.checkbox-on-off {display: none;}');
  if (css) {
    try {
      let elmHead = document.getElementsByTagName('head')[0];
      let elmStyle = document.createElement('style');
      elmStyle.type = 'text/css';
      elmHead.appendChild(elmStyle);
      elmStyle.textContent = css;
    }
    catch (e) {
      if (!document.styleSheets.length) {
        document.createStyleSheet();
      }
      document.styleSheets[0].cssText += css;
    }
  }
});
//
function iyccListenerChange (e) {
  try {
    let id = unsafeWindow.ytplayer.config.args.video_id;
    if (e === 1 || e === 3 || e === 5) {
      self.port.emit('info', {
        duration: player.getDuration(),
        title: unsafeWindow.ytplayer.config.args.title,
        id
      });
    }
    self.port.emit('onStateChange', id, e);
    // quality
    if (e === 1) {
      let levels = player.getAvailableQualityLevels();
      if (levels.length) {
        let val = ['tiny', 'small', 'medium', 'large', 'hd720', 'hd1080', 'hd1440', 'hd2160', 'highres', 'default'][+prefs.quality];
        if (val === 'highres') {
          val = levels[0];
        }
        player.setPlaybackQuality(levels.indexOf(val) !== -1 ? val : 'default');
      }
    }
  }
  catch (e) {}
}
exportFunction(iyccListenerChange, unsafeWindow, {
  defineAs: 'iyccListenerChange'
});
// other extensions/greasemonkey scripts that listen over the global "onYouTubePlayerReady" function should
// push their listener into the global yttools object. This way all the listeners are called without interfering
unsafeWindow.yttools = unsafeWindow.yttools || [];
unsafeWindow.yttools.push(function (e) {
  e = XPCNativeWrapper.unwrap(e);
  player = e;
  let pathname = document.location.pathname;
  if (prefs.autoplay === false && pathname.startsWith('/user') || pathname.startsWith('/channel')) {
    try {
      e.stopVideo();
    }
    catch(e) {}
  }
  // change volume
  try {
    e.setVolume(+prefs.volume);
  }
  catch(e) {}
  // auto buffer
  if (prefs.autobuffer && !prefs.autoplay) {
    try {
      e.playVideo();
      e.pauseVideo();
    }
    catch (e) {}
  }
  // state changes
  try {
    e.addEventListener('onStateChange', 'iyccListenerChange');
    iyccListenerChange(e.getPlayerState());
  }
  catch (e) {}
  // listeners
  self.port.on('play', () => e.playVideo());
  self.port.on('pause', () => e.pauseVideo());
  self.port.on('stop', () => {
    if (e.seekTo) {
      e.seekTo(0);
    }
    e.stopVideo();
    e.clearVideo();
  });
  self.port.on('volume', (v) => e.setVolume(v));
  self.port.on('skip', function () {
    var div = document.querySelector('.playlist-behavior-controls');
    if (!div) {
      return;
    }
    var next = div.querySelector('.next-playlist-list-item');
    if (next) {
      next.click();
    }
  });
  // details
  if (prefs.moreDetails) {
    let button = document.querySelector('#action-panel-details button');
    if (button) {
      window.setTimeout(() => button.click(), 2000);
    }
  }
});
function onYouTubePlayerReady (e) {
  (unsafeWindow.yttools || []).forEach(c => c(e));
}
try {
  exportFunction(onYouTubePlayerReady, unsafeWindow, {
    defineAs: 'onYouTubePlayerReady'
  });
}
catch (e) {}

// config.args
self.port.on('prefs', (p) => {
  prefs = p;

  let script = document.createElement('script');
  script.textContent = `
    (function (observe) {
      observe(window, 'ytplayer', (ytplayer) => {
        observe(ytplayer, 'config', (config) => {
          if (config && config.args) {
            if (${prefs.skipads}) {
              delete config.args.ad3_module;
            }
            if (${prefs.theme} === 1) {
              config.args.theme = 'light';
            }
            if (${prefs.rel} === false) {
              config.args.rel = '0';
            }
            if (${prefs.autohide}) {
              config.args.autohide = '1';
            }
            if (${prefs.autofshow}) {
              config.args.autohide = '0';
            }
            if (${prefs.autoplay} === false && document.location.href.indexOf('autoplay=1') === -1) {
              Object.defineProperty(config.args, 'autoplay', {
                configurable: true,
                get: () => '0'
              });
              config.args.fflags = config.args.fflags.replace("legacy_autoplay_flag=true", "legacy_autoplay_flag=false");
            }
            if (${prefs.annotations} === false) {
              Object.defineProperty(config.args, 'iv_load_policy', {
                configurable: true,
                get: () => '3'
              });
            }
            if (${prefs.disablekb}) {
              config.args.autohide = '1';
            }
            if (${prefs.disablekb} === false) {
              config.args.autohide = '0';
            }
            if (${prefs.color} === 1) {
              config.args.color = 'white';
            }
            config.args.jsapicallback = 'onYouTubePlayerReady';
          }
        });
      });
    })(function (object, property, callback) {
      let value;
      let descriptor = Object.getOwnPropertyDescriptor(object, property);
      Object.defineProperty(object, property, {
        enumerable: true,
        configurable: true,
        get: () => value,
        set: (v) => {
          callback(v);
          if (descriptor && descriptor.set) {
            descriptor.set(v);
          }
          value = v;
          return value;
        }
      });
    });
    // HTML5 spf forward
    document.addEventListener('spfpartprocess', function (e) {
      if (e.detail && e.detail.part && e.detail.part.data && e.detail.part.data.swfcfg) {
        if (${prefs.skipads}) {
          delete e.detail.part.data.swfcfg.args.ad3_module;
        }
        let loc = document.location.href;
        if (loc.indexOf('&list=') !== -1 && loc.indexOf('&index=') !== -1) {
          return;
        }
        if (${prefs.autoplay} === false && loc.indexOf('autoplay=1') === -1) {
          e.detail.part.data.swfcfg.args.autoplay = '0';
        }
      }
    });
    document.addEventListener('spfdone', function (e) {
      if (${prefs.moreDetails}) {
        let button = document.querySelector('#action-panel-details button');
        button.click();
      }
    });
  `;


  document.documentElement.appendChild(script);
  if (document.readyState !== 'loading') {
    let player = document.getElementById('movie_player') || document.getElementById('movie_player-flash');
    if (player) {
      onYouTubePlayerReady(player);
    }
  }
});
