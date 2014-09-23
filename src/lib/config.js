exports.configs = {
  search: {
    url: "http://gdata.youtube.com/feeds/api/videos?q=%q&alt=json",
    sql: 4,
  },
  play: {
    url: "https://www.youtube.com/watch?v=",
    def: "https://www.youtube.com"
  },
  panel: {
    width: 400,
    height: 300,
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