'use strict';

document.documentElement.appendChild(Object.assign(document.createElement('script'), {
  textContent: `{
    let quality = 'default';
    const setQuality = () => {
      if (quality === 'default') {
        return;
      }
      if (iccplayer && iccplayer.setPlaybackQuality) {
        if (quality === 'highest') {
          quality = iccplayer.getAvailableQualityLevels()[0];
        }
        console.log('quality is set to', quality);
        iccplayer.setPlaybackQuality(quality);
      }
    }
    window.addEventListener('message', ({data}) => {
      if (data && data.method === 'command' && data.command === 'quality') {
        quality = data.value;
        setQuality();
      }
      if (data && data.method === 'state' && data.state === 1 && data.fake !== true) {
        setQuality();
      }
    });
  }`
}));
{
  const quality = value => window.postMessage({
    method: 'command',
    command: 'quality',
    value
  }, '*');
  chrome.storage.local.get({
    quality: 'default'
  }, prefs => quality(prefs.quality));
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs.quality) {
      quality(prefs.quality.newValue);
    }
  });
}
