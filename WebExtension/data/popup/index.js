'use strict';

var tabId;

var iframe = {
  e: document.querySelector('iframe'),
  show: path => {
    iframe.e.src = path;
  },
  hide: () => iframe.e.src = ''
};
document.addEventListener('click', () => iframe.hide());

document.getElementById('progress').addEventListener('click', ({offsetX, target}) => {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      method: 'command',
      command: 'seek-to',
      percent: offsetX / target.clientWidth
    });
  }
});

const state = () => {
  //console.log('here');
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      method: 'get-state'
    });
  }
  else {
    chrome.tabs.query({
      url: '*://www.youtube.com/watch*'
    }, tabs => {
      const tab = tabs.filter(t => t.audible).pop() || tabs.pop();
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          method: 'get-state'
        });
      }
      document.body.dataset.player = Boolean(tab);
    });
  }
};
window.setInterval(state, 1000);

var id = null;

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'state') {
    const title = (request.data ? request.data.title : '') || sender.tab.title.replace(' - YouTube', '');
    if (request.data && request.data.video_id !== id) {
      id = request.data.video_id;
      if (localStorage.getItem('thumbnail') !== 'false') {
        window.setTimeout(() => {
          document.getElementById('cover').style['background-image'] =
            `url(https://img.youtube.com/vi/${id}/hqdefault.jpg)`;
        });
      }
      else {
        document.getElementById('cover').style['background-image'] = 'url(icons/cover.jpg)';
      }
    }

    tabId = sender.tab.id;
    document.getElementById('title').textContent = (title || 'video title is not available yet!');
    document.querySelector('#progress div').style.width = request.time.current / request.time.duration * 100 + '%';
    document.getElementById('play').dataset.state = request.state === 1 ? 'play' : 'pause';
  }
});
document.addEventListener('DOMContentLoaded', state);

document.addEventListener('click', ({target}) => {
  const cmd = target.dataset.cmd;
  if (cmd === 'back') {
    document.body.dataset.view = 'controls';
  }
  else if (cmd === 'move-to-settings') {
    document.body.dataset.view = 'settings';
  }
  else if (cmd === 'move-to-history') {
    document.body.dataset.view = 'history';
    iframe.show('history/index.html');
  }
  else if (cmd && tabId) {
    chrome.tabs.sendMessage(tabId, {
      method: 'command',
      command: cmd === 'play' ? target.dataset.state : cmd
    });
  }
});

document.addEventListener('change', ({target}) => {
  if (target.name) {
    chrome.storage.local.set({
      [target.name]: target.checked
    });
    if (target.name === 'thumbnail') {
      localStorage.setItem('thumbnail', target.checked);
    }
  }
  else if (target.id) {
    chrome.storage.local.set({
      [target.id]: target.value
    });
  }
});

document.getElementById('page').addEventListener('toggle', e => {
  localStorage.setItem('page.toggle', e.target.open);
});
document.getElementById('player').addEventListener('toggle', e => {
  localStorage.setItem('player.toggle', e.target.open);
});
try {
  document.getElementById('page').open = localStorage.getItem('page.toggle') === 'true';
  document.getElementById('player').open = localStorage.getItem('player.toggle') === 'true';

  if (localStorage.getItem('player.toggle') === null) {
    document.getElementById('player').open = true;
  }
}
catch (e) {}

chrome.storage.local.get({
  // player
  wide: false,
  next: true,
  autoplay: true,
  autobuffer: false,
  annotations: true,
  quality: 'default',
  // page
  searchbar: true,
  sidebar: true,
  comments: true,
  info: true,
  details: true,
  // extension
  thumbnail: true
}, prefs => {
  Object.entries(prefs).forEach(([key, value]) => {
    if (typeof value === 'string') {
      document.getElementById(key).value = value;
    }
    else {
      document.querySelector(`[name="${key}"]`).checked = value;
    }
  });
});
