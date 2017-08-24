var currentOffset = 0;

function $(id) {
  $[id] = $[id] || document.getElementById(id);
  return $[id];
}
/** Play list **/
$("history").addEventListener("click",function (e) {
  var target = e.originalTarget;
  if (target.localName === "td") {
    self.port.emit("kill", target.parentNode.getAttribute("videoID"));
  }
  else if (target.localName === "tr") {
    self.port.emit(
      target.getAttribute("playing") == "1" ? "pause" : "play",
      target.getAttribute("videoID")
    );
  }
}, false);


document.addEventListener("change", function (e) {
  let target = e.target;
  let pref = target.dataset.pref;
  if (pref) {
    self.port.emit('prefs', {
      name: pref,
      value: target.checked
    });
  }
});
self.port.on('prefs', function (obj) {
  var elem = document.querySelector(`[data-pref="${obj.name}"]`);
  if (elem) {
    elem.checked = obj.value;
  }
});
Array.from(document.querySelectorAll('[data-pref]')).forEach(e => self.port.emit('prefs', {
  name: e.dataset.pref,
  value: null
}));
/*
var move = (function () {
  var dragged;
  var isTr  = e => e.originalTarget.localName === "tr";
  var paint = (e, type, name) => e.originalTarget.classList[type](name);

  return {
    drag: {
      start: function (e) {
        if (!isTr(e)) return;
        e.dataTransfer.setData('text/html', null);
        paint(e, "add", "over-initiated");
        dragged = e;
      },
      over: (e) => e.preventDefault(),
      enter: (e) => paint(e, "add", "over"),
      leave: (e) => paint(e, "remove", "over"),
    },
    drop: function (e) {
      e.preventDefault();
      paint(dragged, "remove", "over-initiated");
      paint(e, "remove", "over");

      var childs = $("history").getElementsByTagName("tr");
      var i = Array.prototype.indexOf.call(childs, dragged.originalTarget);
      var j = Array.prototype.indexOf.call(childs, e.originalTarget);
      console.error(i, j);
    }
  }
})();
$("history").addEventListener("dragstart", move.drag.start, false);
$("history").addEventListener("dragover", move.drag.over, false);
$("history").addEventListener("dragenter", move.drag.enter, false);
$("history").addEventListener("dragleave", move.drag.leave, false);
$("history").addEventListener("drop", move.drop, false);
*/
/** Search and Filter **/
function update(arr, doClean) {
  //Updating buttons
  $("play-button").setAttribute("paused", arr.reduce((p, c) => p || c.state == 1 , false));
  //Updating list
  var trs = $("history").getElementsByTagName("tr");
  arr = arr.splice(0, trs.length);
  arr.forEach(function (o, i) {
    var tr = trs[i], tds = tr.getElementsByTagName("td");
    tr.style = "display: table-row";
    if (o.type) {
      tr.setAttribute("type", o.type);
    }
    else {
      tr.removeAttribute("type");
    }
    tr.setAttribute("videoID", o.id);
    tr.setAttribute("title", o.title);
    tr.setAttribute("playing", o.state);
    tds[2].textContent = o.title;
    tds[3].textContent = (new Date(1970,1,1,0,0,o.duration)).toTimeString().substr(0,8);
  });
  if (doClean) {
    [].slice.call(trs, arr.length).forEach(tr => tr.style = "display: none");
  }
}
$("search-box").addEventListener("input", function () {
  if ($("search-box").value) {
    self.port.emit("search", $("search-box").value);
  }
  else {
    self.port.emit("update");
  }
}, false);
self.port.on("search", arr => update(arr, true));

/** Controls **/
$("play-button").addEventListener("click", function () {
  if ($("play-button").getAttribute("paused") == "true") {
      self.port.emit("pause-all");
  }
  else {
    var trs = $("history").getElementsByTagName("tr");
    var tr = [].reduce.call (trs, (p, c) => p || (c.getAttribute("playing") == 2 ? c : null), null) || trs[0];
    self.port.emit("play", tr.getAttribute("videoID"));
  }
}, false);
$("stop-button").addEventListener("click", () => self.port.emit("stop-all"));
$("next-list").addEventListener("click", function (e) {
  if (e.originalTarget.getAttribute("disabled") == "true") return;
  self.port.emit("update", "p");
});
$("previous-list").addEventListener("click", function (e) {
  if (e.originalTarget.getAttribute("disabled") == "true") return;
  self.port.emit("update", "n");
});
$("settings-button").addEventListener("click", () => self.port.emit("settings"));
$("volume-down").addEventListener("click", () => self.port.emit("volume", "n"));
$("volume-up").addEventListener("click", () => self.port.emit("volume", "p"));
//
self.port.on("update", function (o, isPrevious, isNext) {
  update(o, true);
  $("search-box").value = "";
  $("previous-list").setAttribute("disabled", !isPrevious);
  $("next-list").setAttribute("disabled", !isNext);
});
