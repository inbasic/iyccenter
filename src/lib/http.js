var events           = require("sdk/system/events"),
    prefs            = require("sdk/simple-prefs").prefs,
    {Cc, Ci, Cu, Cr} = require('chrome');

 function TracingListener() {
    this.originalListener = null;
}
TracingListener.prototype = {
  onDataAvailable: function(request, context, inputStream, offset, count) {
    var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"]
      .createInstance(Ci.nsIBinaryInputStream);
    var storageStream = Cc["@mozilla.org/storagestream;1"]
      .createInstance(Ci.nsIStorageStream);
    var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"]
      .createInstance(Ci.nsIBinaryOutputStream);

    binaryInputStream.setInputStream(inputStream);
    var data = binaryInputStream.readBytes(count);
    
    if (prefs.autohide) data = data.replace(/\"autohide\"\:\s*\d\,*/, "");
    if (!prefs.autoplay) data = data.replace(/\"autoplay\"\:\s*\d\,*/, "");
    if (!prefs.annotations) data = data.replace(/\"iv_load_policy\"\:\s*\d\,*/, "");
    if (prefs.disablekb) data = data.replace(/\"disablekb\"\:\s*\d\,*/, "");
    if (!prefs.fs) data = data.replace(/\"fs\"\:\s*\d\,*/, "");
    if (!prefs.rel) data = data.replace(/\"rel\"\:\s*\d\,*/, "");
    if (prefs.theme == "1") data = data.replace(/\"theme\"\:\s*[^\,]*\,*/, "");
    //if (prefs.color == "1") data = data.replace(/\"color\"\:\s*[^\,]*\,*/, "");
    if (prefs.skipads) data = data.replace(/\"ad3_module\"\:\s*[^\,]*\,*/, "");

    if (data.contains('"args":')) {
      data = data.replace(/\"args\"\:\s*\{([^\}]*)\}*/, function (a, b) {
        var c = b;
        if (prefs.autohide) c = '"autohide": 1, ' + c;
        if (!prefs.autoplay) c = '"autoplay": 0, ' + c;
        if (!prefs.annotations) c = '"iv_load_policy": 3, ' + c;
        if (prefs.disablekb) c = '"disablekb": 1, ' + c;   
        if (!prefs.fs) c = '"fs": 0, ' + c;               
        if (!prefs.rel) c = '"rel": 0, ' + c;
        if (prefs.theme == "1") c = '"theme": "light", ' + c;  
        if (prefs.color == "1") c = '"color": "white", ' + c;

        return a.replace(b, c);
      });
    }
    count = data.length;
    
    storageStream.init(8192, count, null);
    binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));
    binaryOutputStream.writeBytes(data, count);
    binaryOutputStream.close();

    this.originalListener.onDataAvailable(request, context, storageStream.newInputStream(0), offset, count);
  },
  onStartRequest: function(request, context) {
      this.originalListener.onStartRequest(request, context);
  },
  onStopRequest: function(request, context, statusCode) { 
      this.originalListener.onStopRequest(request, context, statusCode);
  },
  QueryInterface: function (aIID) {
      if (aIID.equals(Ci.nsIStreamListener) ||
          aIID.equals(Ci.nsISupports)) {
          return this;
      }
      throw Cr.NS_NOINTERFACE;
  }
}

function onExamineResponse ({data, subject, type}) {
  if (type !== "http-on-examine-response") return;
  subject.QueryInterface(Ci.nsIHttpChannel);
  var url = subject.URI.spec;
  if (!url.contains("youtube.com/watch?v=")) return;

  var newListener = new TracingListener();
  subject.QueryInterface(Ci.nsITraceableChannel);
  newListener.originalListener = subject.setNewListener(newListener);
}
events.on("http-on-examine-response", onExamineResponse);

/*

    flashvars = flashvars.replace(new RegExp('(&amp;|[&?])?(' + [
      '', 'ad3_module', 'adsense_video_doc_id', 'allowed_ads', 'baseUrl', 
      'cafe_experiment_id', 'afv_inslate_ad_tag','advideo', 'ad_device', 'ad_channel_code_instream', 
      'ad_channel_code_overlay', 'ad_eurl', 'ad_flags', 'ad_host', 'ad_host_tier', 'ad_logging_flag', 
      'ad_preroll', 'ad_slots', 'ad_tag', 'ad_video_pub_id', 'aftv', 'afv', 'afv_ad_tag', 
      'afv_instream_max', 'afv_ad_tag_restricted_to_instream', 'afv_video_min_cpm', 'prefetch_ad_live_stream'
    ].join('|') + ')=[^&]*', 'g'), '');
    
    
*/