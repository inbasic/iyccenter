/* globals self */
'use strict';

function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || window.content.document.getElementById(id);
  return $.cache[id];
}
self.port.on('prefs', function (prefs) {
  if (!prefs.sidebar && $('watch7-sidebar')) {
    $('watch7-sidebar').style.display = 'none';
  }
  if (!prefs.discussion && $('watch-discussion')) {
    $('watch-discussion').style.display = 'none';
  }
  if (!prefs.views && $('watch7-views-info')) {
    $('watch7-views-info').style.display = 'none';
  }
  if (!prefs.actions && $('watch8-secondary-actions')) {
    $('watch8-secondary-actions').style.display = 'none';
  }
  if (!prefs.views && !prefs.actions && $('watch8-action-buttons')) {
    $('watch8-action-buttons').style.display = 'none';
  }
  if (!prefs.details && $('action-panel-details')) {
    $('action-panel-details').style.display = 'none';
  }
  if (!prefs.header && $('masthead-positioner')) {
    $('masthead-positioner').style.display = 'none';
  }
  if (!prefs.header && $('masthead-positioner-height-offset')) {
    $('masthead-positioner-height-offset').style.display = 'none';
  }
  if ($('autoplay-checkbox')) {
    if ($('autoplay-checkbox').checked && !prefs.playlist) {
      $('autoplay-checkbox').parentNode.removeChild($('autoplay-checkbox'));
    }
  }
 });
