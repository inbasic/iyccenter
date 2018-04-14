'use strict';

window.addEventListener('message', e => {
  if (e.data && e.data.method === 'state') {
    chrome.runtime.sendMessage(e.data);
  }
});

document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `
    var yttools = yttools || [];
    var iccplayer;
    function onYouTubePlayerReady(e) {
      yttools.forEach(c => {
        try {
          c(e);
        }
        catch (e) {}
      });
    }
    yttools.push(e => {
      let state = -1;
      iccplayer = e;
      const report = (fake) => {
        window.postMessage({
          method: 'state',
          state,
          fake,
          time: e.getProgressState(),
          data: e.getVideoData()
        }, '*');
      };
      report(true);
      e.addEventListener('onStateChange', s => {
        state = s;
        report();
      });

      // controls
      window.addEventListener('message', ({data}) => {
        if (data) {
          if (data.method === 'get-state') {
            report(true);
          }
          else if (data.method === 'command') {
            if (data.command === 'stop') {
              e.stopVideo();
            }
            else if (data.command === 'pause') {
              e.playVideo();
            }
            else if (data.command === 'play') {
              e.pauseVideo();
            }
            else if (data.command === 'previous') {
              e.previousVideo();
            }
            else if (data.command === 'next') {
              e.nextVideo();
            }
            else if (data.command === 'seek-to') {
              e.seekTo(parseInt(data.percent * e.getDuration()));
            }
          }
        }
      });
    });

    {
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
            config.args.jsapicallback = 'onYouTubePlayerReady';
          }
        });
      });
    }
  `
}));

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'get-state' || request.method === 'command') {
    window.postMessage(request, '*');
  }
});
