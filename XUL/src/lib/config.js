exports.configs = {
  search: {
    url: "https://www.googleapis.com/youtube/v3/search?part=snippet&q=%q&type=video&key=AIzaSyAlphXgkjG-MXvlYnnzQv6cneRUepZA0uw",
    sql: 4,
  },
  play: {
    url: "https://www.youtube.com/watch?v=",
    def: "https://www.youtube.com"
  },
  panel: {
    width: 400,
    height: 370,
    numbers: 7
  },
  toolbar: {
    id: "iycenter",
    move: {
      toolbarID: "nav-bar",
      insertbefore: "home-button",
      forceMove: false
    }
  },
  extension: {
    url: "http://firefox.add0n.com/control-center.html",
    time: 3000
  }
}
