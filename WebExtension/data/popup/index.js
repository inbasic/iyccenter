'use strict';

var tabId;

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
    });
  }
};
window.setInterval(state, 1000);

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.method === 'state') {
    tabId = sender.tab.id;
    document.getElementById('title').textContent = sender.tab.title.replace(' - YouTube', '');
    document.querySelector('#progress div').style.width = request.time.current / request.time.duration * 100 + '%';
    document.getElementById('play').dataset.state = request.state === 1 ? 'play' : 'pause';
  }
});
state();

document.addEventListener('click', ({target}) => {
  const cmd = target.dataset.cmd;
  if (cmd && tabId) {
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
}
catch (e) {}

chrome.storage.local.get({
  // player
  wide: false,
  next: true,
  autoplay: true,
  annotations: true,
  quality: 'default',
  // page
  searchbar: true,
  sidebar: true,
  comments: true,
  info: true,
  details: true
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
