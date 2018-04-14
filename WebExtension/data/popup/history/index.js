'use strict';

document.addEventListener('click', e => {
  const target = e.target;
  if (target.href) {
    e.preventDefault();
    chrome.tabs.query({
      active: true,
      currentWindow: true,
      url: ['*://*.youtube.com/*']
    }, ([tab]) => {
      const url = target.href;
      chrome.tabs[tab ? 'update' : 'create']({
        url
      }, () => {
        if (url.endsWith('/feed/history')) {
          window.top.close();
        }
      });
    });
  }
});

var req = new XMLHttpRequest();
req.open('GET', 'https://www.youtube.com/feed/history');
req.onload = () => {

  const tbody = document.querySelector('tbody');
  try {
    let ytInitialData = /window\["ytInitialData"\] = (\{.*\})/.exec(req.responseText);
    ytInitialData = JSON.parse(ytInitialData[1]);
    const videos = ytInitialData.contents.twoColumnBrowseResultsRenderer
      .tabs['0'].tabRenderer.content.sectionListRenderer
      .contents['0'].itemSectionRenderer.contents
      .map(o => Object.assign({
        title: {},
        descriptionSnippet: {},
        lengthText: {},
      }, o.videoRenderer));

    if (videos.length === 1 && !videos[0].title.simpleText) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', 2);
      td.textContent = 'Are you logged in?';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    else {
      videos.map(o => ({
        title: o.title.simpleText,
        description: o.descriptionSnippet.simpleText,
        length: o.lengthText.simpleText,
        videoId: o.videoId
      })).forEach(o => {
        const tr = document.createElement('tr');
        tr.title = (o.title + '\n\n' + o.description).trim();
        const time = document.createElement('td');
        time.textContent = (o.length || '--:--');
        const title = document.createElement('td');
        const a = document.createElement('a');
        a.href = 'https://www.youtube.com/watch?v=' + o.videoId;
        a.textContent = o.title;
        title.appendChild(a);
        tr.appendChild(time);
        tr.appendChild(title);
        tbody.appendChild(tr);
      });
    }
  }
  catch (e) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', 2);
    td.textContent = e.message;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  document.body.dataset.loading = false;
};
req.send();
