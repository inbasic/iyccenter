'use strict';

{
  const style = document.createElement('style');
  style.type = 'text/css';
  style.textContent = '';
  document.documentElement.appendChild(style);

  // reinsert when body is ready
  const mutation = new MutationObserver(() => {
    if (document.body) {
      document.documentElement.appendChild(style);
      mutation.disconnect();
    }
  });
  mutation.observe(document, {childList: true, subtree: true});

  const queries = {
    searchbar: ['#yt-masthead-container', '#container.ytd-masthead'],
    sidebar: ['#watch7-sidebar-contents', '#related.ytd-watch'],
    comments: ['#watch-discussion', 'ytd-comments'],
    info: ['#watch7-user-header', '#watch8-action-buttons', '#info.ytd-video-primary-info-renderer'],
    details: ['#action-panel-details', '#meta.ytd-watch']
  };
  let prefs = {
    searchbar: true,
    sidebar: true,
    comments: true,
    info: true,
    details: true
  };

  function update() {
    style.textContent = Object.entries(prefs).map(([key, value]) => {
      if (value) {
        return '';
      }
      else {
        return queries[key].join(', ') + ' {display: none;}';
      }
    }).join('\n');
  }

  chrome.storage.local.get(prefs, ps => {
    prefs = ps;
    update();
  });
  chrome.storage.onChanged.addListener(ps => {
    const a = Object.keys(ps).filter(n => n in prefs);
    if (a.length) {
      a.forEach(key => prefs[key] = ps[key].newValue);
      update();
    }
  });
}
