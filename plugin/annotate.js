/*

Start:
+ register mouse listener

Cancel:
+ cleanup state

Complete:
+ successful end state

*/

document.head.insertAdjacentHTML(
  "beforeend",
  `<style>
  .skmaps-control {
    font-size: 18px;
    text-shadow: 0px 2px 3px black;
  }
  .skmaps-control-active {
    box-shadow: inset 0 2px 4px 1px black;
  }
</style>`
);

L.Marker.Pin = L.Marker.extend({
  options: {
    icon: new L.Icon.Default(),
    draggable: true,
    autoPan: true,
  }
});

L.Marker.Node = L.Marker.extend({
  options: {
    icon: L.icon({ iconUrl: `node-small.svg`, iconSize: L.point(10, 10) }),
    draggable: true,
    autoPan: true,
  }
})

L.marker.pin = function (latlng, opts) {
  return new L.Marker.Pin(latlng, opts).bindPopup(marker => {
    const { lat, lng } = marker.getLatLng();
    const div = L.DomUtil.create("div");
    div.insertAdjacentHTML("afterbegin", `<a href="?lat=${L.Util.formatNum(lat)}&lon=${L.Util.formatNum(lng)}"><span style="user-select:none">Lat: </span>${L.Util.formatNum(lat)},<br/><span style="user-select:none">Lon: </span>${L.Util.formatNum(lng)}</a><br/><br/>`);
    const a = L.DomUtil.create("a", "", div);
    a.href = "#remove";
    a.textContent = "Remove";
    L.DomEvent.on(a, "click", function (ev) {
      ev.preventDefault();
      L.DomEvent.off(a);
      marker.remove();
    });
    return div;
  });
}

L.marker.node = function (latlng, opts) {
  return new L.Marker.Node(latlng, opts);
}

/* Leaflet Annotation State Machine Class */

L.Annotate = L.Class.extend({
  options: {},
  initialize: function (opts) {
    L.Util.setOptions(this, opts);
  },
  annotateStart: function (map, finish, { touch, latlng }) {
    finish();
  },
  annotateEnd: function (map) {},
  getContainer: function () {
    return this._container;
  },
  _container: null,
});

L.Annotate.Pin = L.Annotate.extend({
  annotateStart: function (map, finish, { touch, latlng }) {
    // Point initial placement dependent on input method
    // Touch: Place centre to be moved later
    // Mouse: Move cursor and click to place
    const marker = L.marker.pin(latlng, { interactive: false }).addTo(map);

    this._state = { marker, finish };

    if (touch) {
      this._complete(map.getCenter());
      return;
    }

    this._state.marker.options.interactive = false;
    map.on("click", this._click, this);
    map.on("mousemove", this._move, this);
  },
  annotateEnd: function (map) {
    map.off("click", this._click, this);
    map.off("mousemove", this._move, this);
    this._state.marker.remove();
    this._state = null;
  },
  _move: function (event) {
    this._state.marker.setLatLng(event.latlng);
  },
  _complete: function (latlng) {
    this._state.finish([L.marker.pin(latlng)]);
  },
  _click: function (event) {
    this._complete(event.latlng);
  }
});


/*

TODO:

Quirky node placement
don't rely on map double click for end
use click on final to end.

*/

L.Annotate.Polyline = L.Annotate.extend({
  annotateStart: function (map, finish, { touch, latlng }) {
    this._state = { finish, layer: L.featureGroup(), map };
    this._state.layer.addTo(map);
    this._state.line = L.polyline([]).addTo(this._state.layer);
    map.doubleClickZoom.disable();
    map.getContainer().classList.add("leaflet-crosshair");
    map.on("click", this._click, this);
    map.on("dblclick", this._dblclick, this);
    map.on("mousemove", this._mousemove, this);
  },
  annotateEnd: function (map) {
    map.off("click", this._click, this);
    map.off("dblclick", this._dblclick, this);
    map.off("mousemove", this._mousemove, this);
    map.getContainer().classList.remove("leaflet-crosshair");
    map.doubleClickZoom.enable();
    const polyline = this;
    this._state.line.bindPopup(function (layer) {
      return `Length: ${polyline.getLength().toFixed(1)}m`;
    });
  },
  getLatLngs: function () {
    const latlngs = [];
    for (const layer of this._state.layer.getLayers()) {
      if (layer instanceof L.Marker) {
        latlngs.push(layer.getLatLng());
      }
    }
    return latlngs;
  },
  getLength: function () {
    const points = this.getLatLngs();
    let length = 0;
    for (let i = 1; i < points.length; ++i) {
      length += points[i - 1].distanceTo(points[i]);
    }
    return length;
  },
  _dblclick: function (event) {
    this._state.layer.removeLayer(this._lastNode);
    this._state.finish();
    this._state.line.setLatLngs(this._state.line.getLatLngs().slice(0, -2));
  },
  _click: function (event) {
    const node = L.marker.node(event.latlng);
    this._lastNode = node;
    this._state.layer.addLayer(node);
    this._state.line.addLatLng(event.latlng);
    if (this._state.line.getLatLngs().length == 1) {
      this._state.line.addLatLng(event.latlng);
    }
    node.on("drag", function (ev) {
      this._state.line.setLatLngs(this.getLatLngs());
    }, this);
  },
  _mousemove: function (event) {
    const points = this._state.line.getLatLngs();
    points.pop();
    points.push(event.latlng);
    this._state.line.setLatLngs(points);
  },
  _lastNode: null,
});

L.annotate = {};

L.annotate.pin = function (opts) {
  return new L.Annotate.Pin(opts);
}

L.annotate.polyline = function (opts) {
  return new L.Annotate.Polyline(opts);
}

/* Leaflet Annotation Control  */

L.Control.Annotate = L.Control.extend({
  options: {
    position: "topleft",
  },
  initialize: function (widgets, opts) {
    L.Control.prototype.initialize.call(this, opts);
    this._widgets = widgets;
  },
  /** Setup leaflet control bar */
  onAdd: function (map) {
    const menu = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    const widgets = new Map();
    for (const label in this._widgets) {
      const a = L.DomUtil.create("a", "skmaps-control", menu);
      a.href = "#";
      a.textContent = label;
      widgets.set(a, this._widgets[label]);
      this._widgets[label]._container = a;
    }
    map.on("keydown", this._escCancel, this);
    L.DomEvent.disableClickPropagation(menu);
    L.DomEvent.on(menu, "click", ev => ev.preventDefault());
    L.DomEvent.on(menu, "touchstart", ev => ev.preventDefault());
    L.DomEvent.on(menu, "pointerdown", ev => {
      ev.preventDefault();
      ev.target.releasePointerCapture(ev.pointerId);
    });
    L.DomEvent.on(menu, "pointerup", ev => {
      ev.preventDefault();
      const oldContainer = this._currentTool?.getContainer();
      this._cancel();
      // activate new
      ev.target.releasePointerCapture(ev.pointerId);

      if (ev.target === oldContainer || ev.target === menu) {
        return;
      }

      this._currentTool = widgets.get(ev.target);
      this._currentTool.getContainer().classList.add("skmaps-control-active");
      this._currentTool.annotateStart(map, (function finish(layers) {
        if (layers instanceof Array) {
          for (const layer of layers) layer.addTo(map);
        } else if (layers instanceof L.Layer) {
          layers.addTo(map);
        }
        this._cancel();
      }).bind(this), { touch: ev.pointerType != "mouse", latlng: this._latlng });
    }, this);
    map.on("mousemove", this._mouseUpdate, this);
    return menu;
  },
  /** remove control bar */
  onRemove: function (map) {
    L.DomEvent.off(this.getContainer());
    map.off("keydown", this._escCancel, this);
    map.off("mousemove", this._mouseUpdate, this);
  },
  _escCancel: function (event) {
    if (event.originalEvent.key == "Escape") {
      this._cancel();
    }
  },
  _cancel: function () {
    this._currentTool?.annotateEnd(map);
    this._currentTool?.getContainer().classList.remove("skmaps-control-active");
    this._currentTool = null;
  },
  _currentTool: null,
  _mouseUpdate: function (ev) {
    this._latlng = ev.latlng;
  },
});

L.control.annotate = function (widgets, opts) {
  return new L.Control.Annotate(widgets, opts);
}
