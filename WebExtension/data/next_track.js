'use strict';
{
  const next = checked => {
    const e = document.getElementById('autoplay-checkbox');
    if (e) {
      e.checked = checked;
    }
    const t = document.querySelector('paper-toggle-button#toggle');
    if (t) {
      if (t.getAttribute('aria-pressed') !== String(checked)) {
        t.click();
      }
    }
  };
  window.addEventListener('message', function _(e) {
    if (e.data && e.data.method === 'state' && e.data.state === 1) {
      window.removeEventListener('message', _);
      chrome.storage.local.get({
        next: true
      }, prefs => next(prefs.next));
    }
  });
  chrome.storage.onChanged.addListener(prefs => {
    if (prefs.next) {
      next(prefs.next.newValue);
    }
  });
}
