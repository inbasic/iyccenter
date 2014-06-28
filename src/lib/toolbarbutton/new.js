exports.ToolbarButton = function (options) {
  var {Cu}   = require('chrome'),
      utils = require('sdk/window/utils');
  Cu.import("resource:///modules/CustomizableUI.jsm");

  var listen = {
    onWidgetBeforeDOMChange: function(tbb, aNextNode, aContainer, aIsRemoval) {
      if (tbb.id != options.id) return;
      if (tbb.isInstalled) return;
      tbb.isInstalled = true;
      
      tbb.addEventListener("command", function(e) {
        if (e.ctrlKey) return;
        if (e.originalTarget.localName == "menu" || e.originalTarget.localName == "menuitem") return;

        if (options.onCommand) {
          options.onCommand(e, tbb);
        }

        if (options.panel) {
          options.panel.show(tbb);
        }
      }, true);
      if (options.onClick) {
        tbb.addEventListener("click", function (e) {
          options.onClick(e, tbb);
          return true;
        });
      }
      if (options.onContext) {
        tbb.addEventListener("contextmenu", function (e) {
          options.onContext(e, tbb);
        }, true);
      }
    }
  }
  CustomizableUI.addListener(listen);

  var getButton = () => utils.getMostRecentBrowserWindow().document.getElementById(options.id);
  var button = CustomizableUI.createWidget({
    id : options.id,
    defaultArea : CustomizableUI.AREA_NAVBAR,
    label : options.label,
    tooltiptext : options.tooltiptext
  });
  
  //Destroy on unload
  require("sdk/system/unload").when(function () {
    CustomizableUI.removeListener(listen);
    CustomizableUI.destroyWidget(options.id);
  });
  
  return {
    destroy: function () {
      CustomizableUI.destroyWidget(options.id);
    },
    moveTo: function () {
    
    },
    get label() button.label,
    set label(value) {
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        tbb.setAttribute("label", value);
      });
    },
    get tooltiptext() button.tooltiptext,
    set tooltiptext(value) {
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        tbb.setAttribute("tooltiptext", value);
      });
    },
    set state(value) {
      button.instances.forEach(function (i) {
        var tbb = i.anchor.ownerDocument.defaultView.document.getElementById(options.id);
        console.error(value, !value)
        if (value) {
          tbb.setAttribute("state", value);
        }
        else {
          tbb.removeAttribute("state");
        }
      });
    },
    get object () {
      return getButton();
    }
  }
}