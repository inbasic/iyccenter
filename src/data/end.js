/* globals XPCNativeWrapper, exportFunction, unsafeWindow, self */
'use strict';

function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || window.content.document.getElementById(id);
  return $.cache[id];
}
var player = () => XPCNativeWrapper.unwrap ($('movie_player') || $('movie_player-flash') || {});
function id (p) {
  return (/[?&]v=([^&]+)/.exec(p.getVideoUrl()) || [null, null])[1];
}
var location = () => window.content.document ? window.content.document.location.href : '';
function title () {
  if (!window.content.document) {
    return 'no title';
  }
  return [].reduce.call(window.content.document.getElementsByClassName('watch-title'), (p, c) => c.title, 'no title');
}

function youtube (callback, pointer) {
  function Player (p) {
    // Accessing the JavaScript functions of the embedded player
    p = player();
    var extend = {
      getAvailableQualityLevels: p.getAvailableQualityLevels,
      getDuration: () => p.getDuration(),
      nextVideo: () => p.nextVideo(),
      getTitle: () => title(),
      getVideoUrl: () => p.getVideoUrl(),
      loadVideoById: (id) => p.loadVideoById(id),
      loadVideoByUrl: (url) => p.loadVideoByUrl(url),
      addEventListener: (a, b) => p.addEventListener(a, b),
      play: () => p.playVideo(),
      pause: () => p.pauseVideo(),
      setVolume: (v) => p.setVolume(v),
      stop: function () {
        if (p.seekTo) {
          p.seekTo(0);
        }
        p.stopVideo();
        p.clearVideo();
      },
      quality: function (val) {
        var levels = p.getAvailableQualityLevels();
        p.setPlaybackQuality(levels.indexOf(val) !== -1 ? val : 'default');
      },
      html: () => p
    };
    return extend;
  }

  var p = new Player();
  if (p && p.getAvailableQualityLevels) {
    callback.call(pointer, p);
  }
}

function init (type) {
  var doOnce;
  youtube(function (p) {
    function iyccListenerChange (e) {
      self.port.emit('onStateChange', id(p), e);
      if (e === 1 || e === 3) {
        if (!doOnce) {
          // should I stop video from buffering?
          var isHTML5 = !!p.html().querySelector('video');
          if (!self.options.prefs.autoplay && !self.options.prefs.autobuffer && isHTML5 && type === 'DOMContentLoaded') { // HTML 5 player only
            doOnce = true;
            p.stop();
          }
          // change video quality
          p.quality (
            ['small', 'medium', 'large', 'hd720', 'hd1080', 'highres', 'default'][+self.options.prefs.quality]
          );
          // change volume of the player
          p.setVolume(+self.options.prefs.volume);
          //
          if (self.options.prefs.autobuffer && !self.options.prefs.autoplay) {
            p.play();
            p.pause();
          }
          //
          if (location().contains('autoplay=1')) {
            p.play();
          }
          self.port.emit('info', {
            duration: p.getDuration(),
            title: p.getTitle(),
            id: id(p)
          });
        }
      }
    }
    exportFunction(iyccListenerChange, unsafeWindow, {
      defineAs: 'iyccListenerChange'
    });
    function one () {
      var p = player();
      if (p && p.addEventListener && p.getPlayerState) {
        p.addEventListener('onStateChange', 'iyccListenerChange');
        iyccListenerChange(1);
      }
      else {
        window.setTimeout(one, 1000);
      }
    }
    one();
    self.port.on('play', () => p.play());
    self.port.on('pause', () => p.pause());
    self.port.on('stop', () => p.stop());
    self.port.on('volume', (v) => p.setVolume(v));
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
  });
  //Show more details
  if (self.options.prefs.moreDetails) {
    var button = document.querySelector('#action-panel-details button');
    if (button) {
      window.setTimeout(function () {
        var evObj = document.createEvent('MouseEvents');
        evObj.initMouseEvent('click', true, true, unsafeWindow, null, null, null, null, null, false, false, true, false, 0, null);
        button.dispatchEvent(evObj);
      }, 2000);
    }
  }
}
window.addEventListener('DOMContentLoaded', () => init('DOMContentLoaded'), false);
