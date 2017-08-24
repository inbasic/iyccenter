'use strict';

// annotation and no buffer
document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `{
    // stop the new layer from starting the video
    if (document.cookie.includes('autoplay=false')) {
      document.addEventListener('yt-page-data-fetched', e => {
        if (typeof iccplayer !== 'undefined') {
          iccplayer.stopVideo();
          e.stopPropagation();
        }
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
          }
          if (document.cookie.includes('annotations=false')) {
            Object.defineProperty(config.args, 'iv_load_policy', {
              configurable: true,
              get: () => '3'
            });
          }
          config.args.fflags = config.args.fflags.replace('legacy_autoplay_flag=true', 'legacy_autoplay_flag=false');
        }
      });
    });
  }`
}));
