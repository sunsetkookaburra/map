
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

function html(strings, ...values) {
  const template = document.createElement("template");
  if (strings.length == 0) return null;
  let out = strings[0];
  for (let i = 1; i < strings.length; ++i) {
    out += values[i-1] + strings[i];
  }
  template.insertAdjacentHTML("beforeend", out);
  const el = template.firstElementChild;
  el.remove();
  return el;
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
  constructor(btns) {
    this._active = null;
    this._activeController = null;
    this._menu = document.createElement("menu");
    this._menu.className = "skmaps-menu";

    for (const btn of btns) {
      this.addButton(btn);
    }
  }

  get element() {
    return this._menu;
  }

  addButton({ icon, title, click }) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.title = title;
    btn.insertAdjacentHTML("beforeend", icon);
    btn.addEventListener("click", async () => {
      this.clear();
      this._active = btn;
      this._activeController = new AbortController();
      btn.classList.add("active");
      await click(this._activeController.signal);
      this.clear();
    });

    this._menu.insertAdjacentElement("beforeend", li);
  }

  clear() {
    this._activeController?.abort();
    this._active?.classList.remove("active");
  }
}

// Separate layers control also needed - graphical hide+show/heirarchy

// Drawing tools control

/**
 * Control: Annotation Toolbar
 *
 * Single-Select Tools
 * + 📍 Pin
 * + ✏️ Draw
 * + 🖌️ Freedraw
 * + 📂 Import (Overwrite or Append)
 * + 📤 Export (GeoJSON File or URL)
 *
 * Multi-Select Modifiers
 * + 🧲 Magnet Snap
 */
L.Control.Annotate = L.Control.extend({
  includes: L.Evented.prototype,
  options: {
    position: "topleft",
  },
  initialize (options) {
    L.Control.prototype.initialize.call(this, options);
    this._layers = L.featureGroup([], {
      attribution: `<a style="position:relative" href="https://github.com/sunsetkookaburra/maps"><img src="./res/github-mark.svg" style="position:relative;object-fit:contain;height:1em;top:0.1em" width="10" height="10"> SkAnnotate</a>`,
    });
    this._popup = L.popup({ closeButton: false, className: "skmaps-control-popup", minWidth: 0 });
    this._modal = document.createElement("dialog");
    this._modal.className = "skmaps-dialog";
    this._modalTitle = document.createElement("h2");
    this._modalClose = document.createElement("button");
    this._modalClose.textContent = "X";
    this._modalClose.addEventListener("click", () => {
      this._modal.dispatchEvent(new Event("cancel"));
      this._modal.close();
    });
    this._modalForm = document.createElement("form");
    this._modalForm.method = "dialog";
    this._modal.append(this._modalTitle, this._modalClose, this._modalForm);
    this._activeWidget = null;
    this._targetlatlng = L.latLng([0,0]);

    this._winkeydown = ev => {
      if (ev.key == "Escape") this.fire("cancel");
    };
    this._mapevents = {
      click: ev => {
        this.fire("click", ev);
      },
      mousemove: ev => {
        this._targetlatlng = ev.latlng;
        this.fire("mousemove", ev);
      },
      contextmenu: ev => {},
    };
    const cancelHandler = () => {
      this.off();
      this.radioUp();
      this.clearCursor();
      this.on("cancel", cancelHandler);
    };
    this.on("cancel", cancelHandler);
  },
  onAdd(map) {
    this._targetlatlng = map.getCenter();

    // Container / Inner
    this._layers.addTo(map);
    map.getContainer().insertAdjacentElement("afterend", this._modal);

    // UI Elements
    // this._container = html`
    //   <menu class="leaflet-bar leaflet-control" style="padding:0"></menu>
    // `;
    this._container = html`
      <menu class="skmaps-menu"></menu>
    `;

    this.addWidget("📍", "Pin a marker.", (el) => {
      L.annotate.pin(this, el, {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: L.GeoJSON.latLngToCoords(this.getTargetLatLng()),
        },
      }).addTo(this._layers).reposition();
    });
    this.addWidget("✏️", "Draw a line.", (el) => {
      L.annotate.polyline(this, el, {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      }).addTo(this._layers).extendBack();
    });
    this.addWidget("📂", "Import annotations.", (el) => {

    });
    this.addWidget("📤", "Export annotations.", (el) => {

    });
    // this.addWidget("🔗", "Get a URL to share the map.", (el) => {

    // });
    // TODO: State widget (toggleable separately) / widget groupings
    this.addWidget("🧲", "Snap annotations to existing points.", (el) => {

    });

    // Events
    map.on(this._mapevents);
    window.addEventListener("keydown", this._winkeydown);
    L.DomEvent.disableClickPropagation(this._container);

    return this._container;
  },
  onRemove(map) {
    this._layers.remove();
    this._popup.close();
    this._modal.remove();
    map.off(this._mapevents);
    window.removeEventListener("keydown", this._winkeydown);
  },
  addWidget(icon, label, action) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.title = label;
    btn.textContent = icon;
    // const el = html`
    //   <button class="skmaps-control" aria-label="${label}">${icon}</button>
    // `;
    // L.DomEvent.disableClickPropagation(el);
    btn.addEventListener("click", ev => {
      if (this.radioDown(btn)) return this.radioUp();
      action(btn);
    });
    li.append(btn);
    this._container.appendChild(li);
  },
  setCursor(type) {
    this.clearCursor();
    switch (type) {
      case "crosshair":
        this._map.getContainer().classList.add("leaflet-crosshair");
        break;
    }
  },
  clearCursor() {
    this._map.getContainer().classList.remove("leaflet-crosshair");
  },
  radioDown(el) {
    const oldWidget = this._activeWidget;
    this.radioUp();
    this._activeWidget = el;
    el.classList.add("active");
    return oldWidget === this._activeWidget;
  },
  radioUp() {
    this.fire("cancel");
    this._activeWidget?.classList.remove("active");
    this._activeWidget = null;
  },
  getTargetLatLng() {
    return this._targetlatlng;
  },
  // race(events, handler) {
  //   for (let i = 0; i < events.length; ++i) {
  //     const raceHandler = () => {
  //       for (let j = 0; j < events.length; ++j) {
  //         if (j != i) this.off(events[i], raceHandler);
  //       }
  //       handler();
  //     };
  //     this.on(events[i], raceHandler);
  //   }
  // },
  bindContextDialog(layer, btns, context) {
    layer.off("contextmenu");
    layer.on("contextmenu", ev => {
      const dialog = document.createElement("dialog");
      dialog.open = true;
      const menu = document.createElement("menu");
      for (const { icon, title, click } of btns) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.title = title;
        btn.insertAdjacentHTML("beforeend", icon);
        btn.addEventListener("click", () => {
          this._popup.close();
          click.call(context);
        });
        li.append(btn);
        menu.append(li);
      }
      dialog.append(menu);
      this._popup.setContent(dialog).setLatLng(ev.latlng).openOn(this._map);
    });
  },
  openModal(title, content) {
    if (title instanceof Element) {
      this._modalTitle.replaceChildren();
      this._modalTitle.insertAdjacentElement("beforeend", title);
    } else if (typeof title === "string") {
      this._modalTitle.replaceChildren();
      this._modalTitle.insertAdjacentHTML("beforeend", title);
    }
    if (content instanceof Element) {
      this._modalForm.replaceChildren();
      this._modalForm.insertAdjacentElement("beforeend", content);
    } else if (typeof content === "string") {
      this._modalForm.replaceChildren();
      this._modalForm.insertAdjacentHTML("beforeend", content);
    }
    return new Promise(res => {
      this._modal.showModal();
      const controller = new AbortController();
      const signal = controller.signal;
      this._modal.addEventListener("cancel", () => {
        controller.abort();
        res(null);
      }, { signal });
      this._modal.addEventListener("close", () => {
        controller.abort();
        res(this._modal.returnValue);
      }, { signal });
    });
  },
});

L.control.annotate = function (opts) {
  return new L.Control.Annotate(opts);
}

L.annotate = {};

L.Annotate = L.FeatureGroup.extend({
  initialize(ctrl, widget, feature, options) {
    L.FeatureGroup.prototype.initialize.call(this);
    this._ctrl = ctrl;
    this._widget = widget;
    this._feature = feature;
    L.setOptions(this, options);
    this?.onInit();
  },
  remove() {
    this.removeFrom(this._ctrl._layers);
  },
  ctrl() {
    return this._ctrl;
  },
});

L.Annotate.Pin = L.Annotate.extend({
  _DIALOG: [
    {
      icon: "&#x2139;&#xfe0f;", title: "Stats",
      click() {
        const { lat, lng } = this._inner.getLatLng();
        this._ctrl.openModal(
          "Pin Info:",
          `Lat: ${L.Util.formatNum(lat)}<br/>Lng: ${L.Util.formatNum(lng)}`,
        );
      }
    },
    {
      icon: "❌", title: "Remove",
      click() {
        this.remove();
      },
    },
  ],
  onInit() {
    if (this._feature.geometry.type != "Point") throw new TypeError("Expected LineString");
    this._inner = L.marker(L.GeoJSON.coordsToLatLng(this._feature.geometry.coordinates), {
      draggable: true,
      autoPan: true,
    }).addTo(this);
    this._ctrl.bindContextDialog(this._inner, this._DIALOG, this);
  },
  // Interactive
  reposition() {
    this._initial ??= true;
    this._ctrl.setCursor("crosshair");
    const events = {
      mousemove: (ev) => {
        this._inner.setLatLng(ev.latlng);
      },
      click: (ev) => {
        this._inner.setLatLng(ev.latlng);
        this._initial = false;
        this._ctrl.fire("cancel");
      },
      cancel: () => {
        if (this._initial) this.removeFrom(this._ctrl._layers);
      },
    };
    this._ctrl.on(events);
    globalThis.x = this;
  },
});

L.annotate.pin = function (ctrl, widget, feature, options) {
  return new L.Annotate.Pin(ctrl, widget, feature, options);
}

/**
 * Drawing: Line Tool
 *
 * Edge Nodes:
 * + Extend
 * + Join (contextmenu, join-to, select-other, new-segment/new-merged-line)
 * + Dist from other end, dist to select-other
 *
 * Inside Nodes:
 * + Split
 * + Dist from end points, dist to select-other

 * Path:
 * + Dblclick add new node
 * + Contextmenu: Stats, delete, styling, export, fitbounds
*/
L.Annotate.Polyline = L.Annotate.extend({
  _DIALOG_END: [
    { icon: "⏩", value: "extend" },
    { icon: "🩹", value: "join" },
    { icon: "&#x2139;&#xfe0f;", value: "stats" },
    { icon: "❌", value: "remove" },
  ],
  _DIALOG_MIDDLE: [
    { icon: "✂️", value: "split" },
    { icon: "&#x2139;&#xfe0f;", value: "stats" },
    { icon: "❌", value: "remove" },
  ],
  _DIALOG_LINE: [
    { icon: "❇️", value: "add" },
    { icon: "&#x2139;&#xfe0f;", value: "stats" },
    { icon: "❌", value: "remove" },
  ],
  onInit() {
    if (this._feature.geometry.type != "LineString") throw new TypeError("Expected LineString");
    this._previewingBack = false;
    this._back = null;

    // LatLng Node Instances
    const latlngs = L.GeoJSON.coordsToLatLngs(this._feature.geometry.coordinates);
    // Line (interactable)
    this._interactive = L.polyline(latlngs, { weight: 10, color: "transparent" }).addTo(this);
    // Line (visible)
    this._line = L.polyline(latlngs, { interactive: false, weight: 6 }).addTo(this);
    // Edit Nodes
    this._editNodes = L.layerGroup().addTo(this);
    for (const latlng of latlngs) {
      this._pushBack(latlng);
    }
    this._line.redraw();
    // Join functionality
    // Split functionality
    // Line Ends
    this._dialogEnd = this._ctrl.createEditDialog(this._DIALOG_END);
    this._dialogMiddle = this._ctrl.createEditDialog(this._DIALOG_MIDDLE);
    this._dialogLine = this._ctrl.createEditDialog(this._DIALOG_LINE);
    this._interactive.on("contextmenu", this._dialogLine.open);
  },
  _pushBack(latlng) {
    this._unpreviewBack();
    this._line.addLatLng(latlng);
    this._interactive.addLatLng(latlng);
    if (this._back !== null) {
      this._back.off("click");
      this._back.off("contextmenu");
      this._initial ??= true;
      if (this._initial) {
        this._back.on("contextmenu", this._dialogEnd.open);
        this._initial = false;
      } else {
        this._back.on("contextmenu", this._dialogMiddle.open);
      }
    }
    const node = L.marker.node(latlng).addTo(this._editNodes);
    node.on("drag", ev => {
      latlng.lat = ev.latlng.lat;
      latlng.lng = ev.latlng.lng;
      this._redraw();
      this._ctrl._popup.close();
    });
    node.on("contextmenu", this._dialogEnd.open);
    this._back = node;
    return node;
  },
  _previewBack(latlng) {
    if (this._previewingBack) this._unpreviewBack();
    this._previewingBack = true;
    this._line.addLatLng(latlng);
  },
  _unpreviewBack() {
    if (this._previewingBack) {
      this._line.getLatLngs().pop();
      this._redraw();
      this._previewingBack = false;
    }
  },
  _redraw() {
    this._line.setLatLngs(this._line.getLatLngs());
    this._interactive.setLatLngs(this._interactive.getLatLngs());
  },
  extendBack() {
    this._ctrl.setCursor("crosshair");
    const events = {
      mousemove: (ev) => {
        this._previewBack(ev.latlng);
      },
      click: (ev) => {
        const node = this._pushBack(ev.latlng);
        node.on("dblclick", L.DomEvent.stopPropagation);
        node.on("click", (ev) => {
          node.off("click");
          this._ctrl.fire("cancel");
        });
      },
      cancel: () => {
        this._unpreviewBack();
        if (this._interactive.getLatLngs().length < 2) this.removeFrom(this._ctrl._layers);
      },
    };
    this._ctrl.on(events);
  },
  extendFront() {},
  // make all points colinear
  colinear() {},
  _popupEnd() {},
  _popupInside() {},
  _popupLines() {},
});

L.annotate.polyline = function (ctrl, widget, feature, options) {
  return new L.Annotate.Polyline(ctrl, widget, feature, options);
}

// class PolylineController {
//   constructor(ctrl, feature, layer, popup) {
//     if (!(layer instanceof L.Polyline)) throw new TypeError("Expected layer instanceof L.Polyline");

//     this._ctrl = ctrl;
//     this._feature = feature;
//     this._layer = layer;
//     this._popup = popup;

//     layer.annotatePlacement = () => { this.extendBack() };

//     const container = document.createElement("div");
//     container.insertAdjacentHTML("beforeend", `<p></p><p><button>❌</button></p>`);
//     const popupContent = () => {
//       const coords = layer.getLatLngs();
//       let dist = 0;
//       for (let i = 1; i < coords.length; ++i) {
//         dist += coords[i-1].distanceTo(coords[i]);
//       }
//       container.querySelector("p:first-child").textContent = `Length: ${Math.round(dist)}m`;
//       container.querySelector("button").onclick = () => { layer.remove(); };
//       return container;
//     };

//     const editNodes = this._editNodes = L.layerGroup();
//     for (const latlng of layer.getLatLngs()) {
//       L.marker.node(latlng)
//         .addTo(editNodes)
//         .on("drag", ev => {
//           latlng.lat = ev.latlng.lat;
//           latlng.lng = ev.latlng.lng;
//           layer.redraw();
//         })
//         // edit node context menu
//         .on("contextmenu", ev => {
//           popup.setContent(popupContent);
//           popup.setLatLng(ev.latlng);
//           popup.openOn(layer._map);
//         });
//     }

//     layer.on("add", () => {
//       editNodes.addTo(layer._map);
//     });
//     layer.on("remove", () => {
//       editNodes.remove();
//       popup.close();
//     });
//     // line context menu
//     layer.on("contextmenu", ev => {
//       popup.setContent(popupContent);
//       popup.setLatLng(ev.latlng);
//       popup.openOn(layer._map);
//     });
//   }
//   extendBack() {
//     console.log("LAYER BACK");
//     // this._ctrl.push(); // push down radio button
//     // this._ctrl.pop();
//   }
//   extendFront() {

//   }
// }
