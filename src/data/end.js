function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || window.content.document.getElementById(id);
  return $.cache[id];
}

var player;
var id = () => (/[?&]v=([^&]+)/.exec(player.getVideoUrl()) || [null,null])[1];
var location = () => window.content.document ? window.content.document.location.href : "";
function title () {
  if (!window.content.document) return "no title";
  return [].reduce.call(window.content.document.getElementsByClassName("watch-title"), (p, c) => c.title, "no title");
}

function youtube (callback, pointer) {
  function Player (p) {
    // Accessing the JavaScript functions of the embedded player
    p = XPCNativeWrapper.unwrap ($('movie_player') || $('movie_player-flash') || {});
    var extend = {
      getAvailableQualityLevels: p.getAvailableQualityLevels,
      getDuration: () => p.getDuration(),
      getTitle: () => title(),
      getVideoUrl: () => p.getVideoUrl(),
      loadVideoById: (id) => p.loadVideoById(id),
      loadVideoByUrl: (url) => p.loadVideoByUrl(url),
      addEventListener: (a, b) => p.addEventListener(a, b),
      play: () => p.playVideo(),
      pause: () => p.pauseVideo(),
      setVolume: (v) => p.setVolume(v),
      stop: function () {
        if (p.seekTo) p.seekTo(0);
        p.stopVideo();
        p.clearVideo();
      },
      quality: function (val) {
        var levels = p.getAvailableQualityLevels();
        p.setPlaybackQuality(levels.indexOf(val) != -1 ? val : "default");
      }
    }
    return extend;
  }
  
  player = new Player();
  if (player && player.getAvailableQualityLevels) {
    callback.call(pointer);
  }
}

self.port.on("options", function(options) {
  youtube(function () {
    player.quality (
      ["small", "medium", "large", "hd720", "hd1080", "highres", "default"][+self.options.prefs.quality]
    );
    player.setVolume(+self.options.prefs.volume);
    if (!self.options.prefs.autoplay) { // HTML 5 player only
      player.stop();
    }
    if (self.options.prefs.autobuffer && !self.options.prefs.autoplay) {
      player.play();
      player.pause();
    } 
    if (location().contains("autoplay=1")) {
      player.play();
    }
    self.port.emit("info", {
      duration: player.getDuration(),
      title: player.getTitle(),
      id: id()
    });
    //This function is called by YouTube player to report changes in the playing state
    unsafeWindow.iycenterListener = function (e) {
      console.error('state', e)
      self.port.emit("onStateChange", id(), e);
    }
    player.addEventListener("onStateChange", "iycenterListener");
    //Show more details
    if (self.options.prefs.moreDetails) {
      var evObj = document.createEvent('MouseEvents');
      evObj.initMouseEvent('click', true, true, unsafeWindow, null, null, null, null, null, false, false, true, false, 0, null );
      if ($("watch-description-toggle")) $("watch-description-toggle").dispatchEvent(evObj);
    }
  });
});

self.port.on("play", () => player.play());
self.port.on("pause", () => player.pause());
self.port.on("stop", () => player.stop());
self.port.on("volume", (v) => player.setVolume(v));