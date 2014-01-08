function $(id) {
  $.cache = $.cache || [];
  $.cache[id] = $.cache[id] || window.content.document.getElementById(id);
  return $.cache[id];
}

if (!self.options.prefs.sidebar && $("watch7-sidebar")) {
  $("watch7-sidebar").parentNode.removeChild($("watch7-sidebar"));
}
if (!self.options.prefs.discussion && $("watch-discussion")) {
  $("watch-discussion").parentNode.removeChild($("watch-discussion"));
}
if (!self.options.prefs.views && $("watch7-views-info")) {
  $("watch7-views-info").parentNode.removeChild($("watch7-views-info"));
}
if (!self.options.prefs.actions && $("watch7-action-buttons")) {
  $("watch7-action-buttons").parentNode.removeChild($("watch7-action-buttons"));
}
if (!self.options.prefs.details && $("action-panel-details")) {
  $("action-panel-details").parentNode.removeChild($("action-panel-details"));
}