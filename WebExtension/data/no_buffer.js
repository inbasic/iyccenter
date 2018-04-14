'use strict';

// annotation and no buffer
document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `{
    // stop the new layer from starting the video
    if (document.cookie.includes('autoplay=false')) {

      var yttools = yttools || [];
      yttools.push(e => {
        // Method 0
        e.stopVideo();
        // Method 1; prevent polymer from starting video
        const playVideo = e.playVideo;
        e.playVideo = function() {
          const err = new Error().stack;
          if (err && err.indexOf('onPlayerReady_') !== -1) {
            return e.stopVideo();
          }
          playVideo.apply(this, arguments);
        };
        // Method 2; stop subsequent plays
        document.addEventListener('yt-page-data-fetched', () => e.stopVideo && e.stopVideo());
      });
    }
    const observe = (object, property, callback) => {
      let value;
      const descriptor = Object.getOwnPropertyDescriptor(object, property);
      Object.defineProperty(object, property, {
        enumerable: true,
        configurable: true,
        get: () => value,
        set: v => {
          callback(v);
          if (descriptor && descriptor.set) {
            descriptor.set(v);
          }
          value = v;
          return value;
        }
      });
    };
    observe(window, 'ytplayer', ytplayer => {
      observe(ytplayer, 'config', config => {
        if (config && config.args) {
          if (document.cookie.includes('autoplay=false')) {
            Object.defineProperty(config.args, 'autoplay', {
              configurable: true,
              get: () => '0'
            });
            config.args.fflags = config.args.fflags.replace('legacy_autoplay_flag=true', 'legacy_autoplay_flag=false');
          }
          if (document.cookie.includes('annotations=false')) {
            Object.defineProperty(config.args, 'iv_load_policy', {
              configurable: true,
              get: () => '3'
            });
          }
          if (document.cookie.includes('autobuffer=true')) {
            delete config.args.ad3_module;
          }
        }
      });
    });
  }`
}));
// autbuffer
document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `
    yttools.push(e => {
      let proceed = true;
      if (document.cookie.includes('autobuffer=true')) {
        e.addEventListener('onStateChange', () => {
          if (proceed) {
            proceed = false;
            e.pauseVideo();
          }
        });
        e.pauseVideo();
      }
    });
`}));
