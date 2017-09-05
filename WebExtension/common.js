'use strict';

function cookie() {
  chrome.storage.local.get({
    'wide': false
  }, prefs => {
    if (prefs.wide) {
      chrome.cookies.set({
        url: 'https://www.youtube.com',
        name: 'wide',
        value: '1'
      });
    }
    else {
      chrome.cookies.remove({
        url: 'https://www.youtube.com',
        name: 'wide',
      });
    }
  });
}
cookie();
chrome.cookies.onChanged.addListener(changeInfo => {
  if (changeInfo.cookie.name === 'wide' && changeInfo.cookie.value !== '1') {
    cookie();
  }
});

chrome.storage.onChanged.addListener(prefs => {
  if (prefs.wide) {
    cookie();
  }
  if (prefs.autoplay) {
    chrome.cookies.set({
      url: 'https://www.youtube.com',
      name: 'autoplay',
      value: String(prefs.autoplay.newValue)
    });
  }
  if (prefs.autobuffer) {
    chrome.cookies.set({
      url: 'https://www.youtube.com',
      name: 'autobuffer',
      value: String(prefs.autobuffer.newValue)
    });
  }
  if (prefs.annotations) {
    chrome.cookies.set({
      url: 'https://www.youtube.com',
      name: 'annotations',
      value: String(prefs.annotations.newValue)
    });
  }
});

// inject on startup
if (chrome.app && chrome.app.getDetails) {
  chrome.tabs.query({
    url: '*://www.youtube.com/*'
  }, tabs => {
    const contentScripts = chrome.app.getDetails().content_scripts;
    for (const tab of tabs) {
      for (const cs of contentScripts) {
        cs.js.forEach(file => chrome.tabs.executeScript(tab.id, {
          file,
          runAt: cs.run_at,
          allFrames: cs.all_frames,
        }));
      }
    }
  });
}

// browserAction
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'page-removed' || request.method === 'page-added') {
    window.setTimeout(() => chrome.tabs.query({
      url: '*://www.youtube.com/watch*'
    }, tabs => {
      chrome.browserAction.setPopup({
        popup: tabs.length ? '/data/popup/index.html' : ''
      });
    }), 100);
  }
});
chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({
    url: 'https://www.youtube.com/'
  });
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': navigator.userAgent.indexOf('Firefox') === -1
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/control-center.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
