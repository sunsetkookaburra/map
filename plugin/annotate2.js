
// Future
// States: state = extending | settled | moving | etc
// Reduce boilerplate

// WARNING: Evented Data is merged, meaning any references must be behind properties:
// fire("type", instance) must be fire("type", { instance })

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

L.Marker.Node = L.Marker.extend({
  options: {
    icon: L.icon({ iconUrl: `node-small.svg`, iconSize: L.point(10, 10) }),
    draggable: true,
    autoPan: true,
  },
  // getPixelBounds() {
  //   const icon = this.getIcon();
  //   this.getLatLng().toBounds();
  // },
});

L.marker.node = function (latlng, opts) {
  return new L.Marker.Node(latlng, opts);
}

/** Annotation Widget Menu */

L.Control.Annotate = L.Control.extend({
  includes: L.Evented.prototype,
  options: {
    position: "topleft",
  },
  initialize: function (widgets, options) {
    L.Control.prototype.initialize.call(this, options);
    this._widgets = widgets;
  },
  onAdd: function (map) {
    this._coords = map.getCenter();
    // Use a weakmap, since we don't care if the tool is GC'd
    this._tools = new WeakMap();

    /** UI Elements */
    const panel = document.createElement("div");
    panel.className = "leaflet-bar leaflet-control";
    for (const [label, { factory, options }] of Object.entries(this._widgets)) {
      const widget = document.createElement("a");
      widget.className = "skmaps-control";
      widget.href = "#";
      widget.textContent = label;
      widget.addEventListener("click", (ev) => {
        ev.preventDefault();
        L.DomEvent.stopPropagation(ev);
        const tool = factory(this, options);
        this._tools.set(tool.addTo(map), widget);
        tool.onPlacement({
          ctrl: this,
          touch: false,
          latlng: this.getCoords(),
        });
        globalThis.LAST_TOOL = tool;
      });
      panel.appendChild(widget);
    }

    /** Events */
    const cancelHandler = () => {
      this.off();
      for (const el of panel.children) {
        el.classList.remove("skmaps-control-active");
      }
      map.getContainer().classList.remove("leaflet-crosshair");
      this.on("cancel", cancelHandler);
      this.on("resume", resumeHandler);
    };
    const resumeHandler = ({ tool }) => {
      this.fire("cancel");
      this._tools.get(tool)?.classList.add("skmaps-control-active");
    };
    this._escapeHandler = ({ key }) => {
      if (key == "Escape") this.fire("cancel");
    };
    this.on("cancel", cancelHandler);
    this.on("resume", resumeHandler);
    map.on("mousemove", this._onmousemove, this);
    map.on("click", this._onclick, this);
    window.addEventListener("keydown", this._escapeHandler);

    return panel;
  },
  onRemove: function (map) {
    // remove mouse/esc handlers, etc
    map.off("mousemove", this._onmousemove, this);
    map.off("click", this._onclick, this);
    window.removeEventListener("keydown", this._escapeHandler);
    this.fire("cancel");
    this.off();
  },
  getCoords: function () {
    return this._coords;
  },
  pauseZoom() {
    this._map.doubleClickZoom.disable();
    setTimeout(() => { this._map.doubleClickZoom.enable(); }, 50);
  },
  setCrosshair: function () {
    map.getContainer().classList.add("leaflet-crosshair");
  },
  _onmousemove: function (ev) {
    this.fire("coords", { latlng: ev.latlng });
    this._coords = ev.latlng;
  },
  _onclick: function (ev) {
    this.fire("click", {
      latlng: ev.latlng,
      touch: "TouchEvent" in window ? ev.originalEvent instanceof TouchEvent : false,
    });
    this._coords = ev.latlng;
  },
});

L.control.annotate = function (widgets, options) {
  return new L.Control.Annotate(widgets, options);
}

/** Annotation Tools */

L.annotate = {};

L.Annotate = L.FeatureGroup.extend({
  _state: "placement",
  initialize(controller, options) {
    L.FeatureGroup.prototype.initialize.call(this, [], options);
    this._controller = controller;
    this.onCreate();
  },
  getController() { return this._controller },
  onCreate() { this._state = "placed" },
  onPlacement() {},
});

L.Annotate.Pin = L.Annotate.extend({
  onCreate() {
    this._marker = L.marker([0,0], {
      icon: new L.Icon.Default(),
      draggable: true,
      autoPan: true,
    }).bindPopup(marker => {
      const { lat, lng } = marker.getLatLng();
      const div = L.DomUtil.create("div");
      div.insertAdjacentHTML("afterbegin", `<a href="?lat=${L.Util.formatNum(lat)}&lon=${L.Util.formatNum(lng)}"><span style="user-select:none">Lat: </span>${L.Util.formatNum(lat)},<br/><span style="user-select:none">Lon: </span>${L.Util.formatNum(lng)}</a><br/><br/>`);
      const a = L.DomUtil.create("a", "", div);
      a.href = "#remove";
      a.textContent = "Remove";
      L.DomEvent.on(a, "click", ev => {
        ev.preventDefault();
        L.DomEvent.off(a);
        this.remove();
      });
      return div;
    });
    this.addLayer(this._marker);
  },
  onPlacement({ctrl, latlng}) {
    ctrl.setCrosshair();
    this._initCancelHandler = () => { this.remove(); };
    this.fire("resume", {tool: this});
    ctrl.on("cancel", this._initCancelHandler);
    ctrl.on("coords", ({latlng}) => {
      this._marker.setLatLng(latlng);
    });
    ctrl.on("click", ({latlng}) => {
      if (this._initCancelHandler) {
        ctrl.off("cancel", this._initCancelHandler);
        this._initCancelHandler = null;
      }
      ctrl.fire("cancel");
      this._marker.setLatLng(latlng);
    });
  },
  setLatLng(latlng) {
    this._marker.setLatLng(latlng);
  },
  getLatLng() {
    return this._marker.getLatLng();
  },
});

L.annotate.pin = function (controller, options) {
  const pin = new L.Annotate.Pin(controller, options);
  return pin;
}

L.Annotate.Polyline = L.Annotate.extend({
  onCreate() {
    this._head = null;
    this._tail = null;
    this._editNodes = L.layerGroup().addTo(this);
    this._line = L.polyline([], {
      weight: 5,
    }).addTo(this);
  },
  onPlacement(_) {
    this.extendBack();
  },
  // in future, extend(tail) or (head);
  extendBack() {
    this.unbindPopup();
    const ctrl = this.getController();
    ctrl.fire("resume", {tool: this});
    ctrl.setCrosshair();
    this._tail?.on("click", () => {
      ctrl.fire("cancel");
      ctrl.pauseZoom();
      if (this._isPreviewing) this._line.getLatLngs().pop();
      this.bindPopup(this._linePopup.bind(this));
    });
    ctrl.on("click", ({latlng}) => {
      this._tail?.off("click");
      this._pushBack(latlng);
      this.extendBack();
    });
    ctrl.on("coords", ({latlng}) => {
      if (this._isPreviewing) this._line.getLatLngs().pop();
      this._line.addLatLng(latlng);
      this._isPreviewing = true;
    });
  },
  redraw() {
    this._line.setLatLngs(this._editNodes.getLayers().map(l => l.getLatLng()));
    this._isPreviewing = false;
  },
  _pushBack(latlng) {
    this._tail = this._newEditNode(latlng);
    if (this._isPreviewing) {
      this._line.getLatLngs().pop();
      this._isPreviewing = false;
    }
    this._line.addLatLng(latlng);
    return this._tail;
  },
  _newEditNode(latlng) {
    const node = L.marker.node(latlng).addTo(this._editNodes);
    node.on("drag", ev => {
      if (this.isPopupOpen()) this.openPopup(ev.latlng);
      this.redraw();
    });
    return node;
  },
  _linePopup(layer) {
    let dist = 0;
    const latlngs = layer.getLatLngs();
    for (let i = 1; i < latlngs.length; ++i) {
      dist += map.distance(latlngs[i-1], latlngs[i]);
    }
    const container = L.DomUtil.create("div");
    const text = L.DomUtil.create("p", "", container);
    const btn = L.DomUtil.create("button", "", container);
    text.textContent = `Length: ${dist.toFixed(0)}m`;
    btn.textContent = "Delete";
    L.DomEvent.on(btn, "click", () => {
      this.remove();
      L.DomEvent.off(btn);
    });
    return container;
  },
});

L.annotate.polyline = function (controller, options) {
  const polyline = new L.Annotate.Polyline(controller, options);
  return polyline;
}
