
L.Marker.Node = L.Marker.extend({
  options: {
    icon: L.icon({ iconUrl: `node-small.svg`, iconSize: L.point(12, 12) }),
    draggable: true,
    autoPan: true,
  },
});

L.marker.node = function (latlng, opts) {
  return new L.Marker.Node(latlng, opts);
}

// function htmlEncode(text) {
//   return text.replace(/"|'|<|>|&/g, s => {
//     switch (s) {
//       case '"': return "&quot;";
//       case "'": return "&apos;";
//       case "<": return "&lt;";
//       case ">": return "&gt;";
//       case "&": return "&amp;";
//     }
//   });
// }

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function html(text) {
  const template = document.createElement("template");
  template.insertAdjacentHTML("beforeend", text);
  return template.content;
}

// function onceListener(target, type, handler) {
//   const once = function (...args) {
//     target.removeEventListener(type, once);
//     return handler.call(this, ...args);
//   };
//   target.addEventListener(type, once);
// }

function replaceElementChildren(element, content) {
  element.replaceChildren();
  if (typeof content === "string") {
    element.insertAdjacentHTML("beforeend", content);
  } else {
    element.append(content);
  }
}

class ModalDialog {
  constructor() {
    this._dialog = document.createElement("dialog");
    this._dialog.className = "skmaps-dialog";
    this._heading = document.createElement("h2");
    this._closeButton = document.createElement("button");
    this._closeButton.textContent = "X";
    this._closeButton.addEventListener("click", () => {
      this._dialog.dispatchEvent(new Event("cancel"));
      this._dialog.close();
    });
    this._form = document.createElement("form");
    this._form.method = "dialog";

    this._dialog.append(this._heading, this._closeButton, this._form);
  }

  get element() {
    return this._dialog;
  }

  open(heading, content) {
    replaceElementChildren(this._heading, heading);
    replaceElementChildren(this._form, content);
    this._dialog.showModal();
    const controller = new AbortController();
    const signal = controller.signal;
    return new Promise(resolve => {
      this._dialog.addEventListener("cancel", () => {
        controller.abort();
        resolve(null);
      }, { signal });
      this._dialog.addEventListener("close", () => {
        controller.abort();
        resolve(this._dialog.returnValue);
      }, { signal });
    });
  }
}

class RadioMenu {
  /**
   * Create a new RadioMenu Controller
   * @param {{ icon: string, title: string, click: () => void }[]} btns
   */
  constructor(btns, horizontal = false) {
    this._active = null;
    this._activeController = null;
    this._menu = document.createElement("menu");
    this._menu.className = "skmaps-menu";
    if (horizontal) this._menu.className += " horizontal";

    for (const btn of btns) {
      this.addButton(btn);
    }

    L.DomEvent.disableClickPropagation(this._menu);
  }

  get element() {
    return this._menu;
  }

  addButton({ icon, title, click, orientation }) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.title = title;
    if (orientation === "horizontal") btn.className = "horizontal";
    btn.insertAdjacentHTML("beforeend", icon);
    const resume = async () => {
      this.reset();
      this._active = btn;
      btn.classList.add("active");
      click();
    };
    btn.addEventListener("click", resume);
    li.append(btn);
    this._menu.append(li);
  }

  reset() {
    console.log(new Error().stack)
    this._active?.classList.remove("active");
  }
}

/* --- Annotation Control Singleton --- */

L.Control.Annotate = L.Control.extend({
  includes: L.Evented.prototype,
  options: {
    position: "topleft",
  },
  initialize(options) {
    L.Control.prototype.initialize.call(this, options);
    this._aim = L.latLng(0, 0);
    this._group = L.annotate.layer({
      type: "FeatureCollection",
      features: [],
    });
    this._popup = L.popup({ closeButton: false, className: "skmaps-control-popup", minWidth: 0 });
    this._dialog = new ModalDialog();
    this._menu = new RadioMenu([
      {
        icon: "📍", title: "Pin a marker.",
        click: () => {
          this.cancel();
          L.annotate.pin({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: L.GeoJSON.latLngToCoords(this.getAim()),
            },
          })
          .addTo(this._group)
          .reposition();
        }
      }
    ]);
  },
  onAdd(map) {
    if (map.annotationControl) map.annotationControl.remove();
    map.annotationControl = this;
    this._resetHandler();
    this._group.addTo(map);
    L.DomEvent.on(window, "keydown", this._windowkeydown, this);
    map.on("mousemove", this._mapmousemove, this);
    map.on("click", this._mapclick, this);
    map.getContainer().insertAdjacentElement("afterend", this._dialog.element);
    return this._menu.element;
  },
  onRemove(map) {
    map.off("mousemove", this._mapmousemove, this);
    map.off("click", this._mapclick, this);
    L.DomEvent.off(window, "keydown", this._windowkeydown, this);
    this._group.remove();
    this._dialog.element.remove();
  },
  _mapmousemove(ev) {
    this._aim = ev.latlng;
    this.fire("latlng", {
      latlng: ev.latlng,
    });
  },
  _mapclick(ev) {
    this._aim = ev.latlng;
    this.fire("latlng", {
      latlng: ev.latlng,
    });
    this.fire("click", {
      touch: "TouchEvent" in window && ev.originalEvent instanceof TouchEvent,
      point: ev.containerPoint,
    });
  },
  _windowkeydown(ev) {
    if (ev.key == "Escape") {
      this.fire("cancel");
    }
  },
  _resetHandler() {
    this.off();
    this._menu.reset();
    this.clearCrosshair();
    this.on("cancel", () => {
      this.fire("complete");
      this._resetHandler();
    });
    this.on("complete", this._resetHandler, this);
  },
  complete() {
    this.fire("complete");
  },
  cancel() {
    this.fire("cancel");
    this.complete();
  },
  setCrosshair() {
    this._map.getContainer().classList.add("leaflet-crosshair");
  },
  clearCrosshair() {
    this._map.getContainer().classList.remove("leaflet-crosshair");
  },
  getAim() {
    return this._aim;
  },
  openDialog(heading, content) {
    return this._dialog.open(heading, content);
  },
  openContextMenu(latlng, menu) {
    this._popup.setLatLng(latlng).setContent(menu.element).openOn(this._map);
  },
});

L.control.annotate = function (opts) { return new L.Control.Annotate(opts) }

/* --- Annotation Base Class --- */

L.annotate = {};

L.Annotate = L.FeatureGroup.extend({
  initialize(feature, options) {
    L.FeatureGroup.prototype.initialize.call(this);
    this._feature = feature;
    L.setOptions(this, options);
    this.onInit?.();
  },
  remove() {
    this.removeFrom(this._parent);
    this._parent = null;
  },
  getFeature() {
    return this._feature;
  },
  getMap() {
    return this._map;
  },
  getCtrl() {
    return this._map.annotationControl;
  },
  getParentLayer() {
    return this._parent;
  },
});

L.Annotate.Layer = L.Annotate.extend({
  getEvents() {
    return {
      layeradd({ layer }) {
        layer._parent = this;
      },
    };
  },
});

L.annotate.layer = function (feature, options) {
  return new L.Annotate.Layer(feature, options);
}

/* --- Annotation Pin --- */

L.Annotate.Pin = L.Annotate.extend({
  options: {
    draggable: true,
    autoPan: true,
  },
  onInit() {
    const feature = this.getFeature();
    this._marker = L.marker(
      L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
      { draggable: true, autoPan: true },
    ).addTo(this);
    this._marker.on("contextmenu", ev => {
      this.getCtrl().openContextMenu(ev.latlng, new RadioMenu([
        {
          icon: "&#x2139;&#xfe0f;", title: "Stats",
          click: () => {},
        }
      ], true))
    });
  },
  reposition() {
    const ctrl = this.getCtrl();
    const orig = this._marker.getLatLng();
    ctrl.setCrosshair();
    ctrl.on({
      "latlng": ({ latlng }) => {
        this._marker.setLatLng(latlng);
      },
      "click": ({ point }) => {
        ctrl.complete();
      },
      "cancel": () => {
        this._initial ??= true;
        if (this._initial) this.remove();
        else this._marker.setLatLng(orig);
      },
    });
  },
});

L.annotate.pin = function (feature, opts) {
  return new L.Annotate.Pin(feature, opts);
}

