/* globals self */
'use strict';

function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || window.content.document.getElementById(id);
  return $.cache[id];
}

if (!self.options.prefs.sidebar && $('watch7-sidebar')) {
  $('watch7-sidebar').style.display = 'none';
}
if (!self.options.prefs.discussion && $('watch-discussion')) {
  $('watch-discussion').style.display = 'none';
}
if (!self.options.prefs.views && $('watch7-views-info')) {
  $('watch7-views-info').style.display = 'none';
}
if (!self.options.prefs.actions && $('watch8-action-buttons')) {
  $('watch8-action-buttons').style.display = 'none';
}
if (!self.options.prefs.details && $('action-panel-details')) {
  $('action-panel-details').style.display = 'none';
}
