'use strict';
{
  const callback = () => chrome.runtime.sendMessage({
    method: 'page-added'
  });
  document.addEventListener('spfrequest', callback);
  window.addEventListener('yt-navigate-start', callback);
  callback();
}

window.addEventListener('unload', () => chrome.runtime.sendMessage({
  method: 'page-removed'
}));
window.addEventListener('yt-navigate-start', () => console.log(9912));
