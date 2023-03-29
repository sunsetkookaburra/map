
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

L.Marker.Node = L.Marker.extend({
  options: {
    icon: L.icon({ iconUrl: `node-small.svg`, iconSize: L.point(10, 10) }),
    draggable: true,
    autoPan: true,
  }
})

L.marker.node = function (latlng, opts) {
  return new L.Marker.Node(latlng, opts);
}

L.Annotate = L.Class.extend({
  annotateCreate: function (ev) {
    new this.constructor.Model().addTo(ev.map);
    ev.onFinish();
  },
  annotateMouse: function (model, ev) {},
  annotateClick: function (model, ev) {},
  annotateCancel: function (model) {},
  annotateEnd: function (model, ev) {},
});

L.annotate = {};

// Controller
L.Annotate.Pin = L.Annotate.extend({
  annotateCreate: function(ev) {
    const latlng = ev.touch ? ev.map.getCenter() : ev.latlng;
    const model = L.marker.pin(latlng).addTo(ev.map);
    if (ev.touch) ev.onFinish();
    model.dragging.disable();
    return model;
  },
  annotateClick: function (model, ev) {
    ev.onFinish();
    model.dragging.enable();
  },
  annotateMouse: function (model, ev) {
    model.setLatLng(ev.latlng);
  },
  annotateCancel: function (model, ev) {
    model.remove();
  },
});

L.Annotate.Polyline = L.Annotate.extend({
  annotateCreate: function (ev) {
    ev.map.getContainer().classList.add("leaflet-crosshair");
    const model = L.featureGroup([]).addTo(ev.map);
    model._controlPoints = L.layerGroup().addTo(model);
    model._lineDisplay = L.polyline([]).addTo(model);
    return model;
  },
  annotateClick: function (model, ev) {
    const nodes = model._controlPoints;
    const nodesLayers = nodes.getLayers();
    const polyline = model._lineDisplay;
    const oldtail = this._getNode(nodes, -1);
    oldtail?.off("click");
    const newtail = L.marker.node(ev.latlng);
    nodes.addLayer(newtail);
    polyline.addLatLng(ev.latlng);
    newtail.on("drag", dragev => {
      if (model.isPopupOpen()) model.openPopup(dragev.latlng);
      const latlngs = [];
      for (const node of nodes.getLayers()) {
        latlngs.push(node.getLatLng());
      }
      polyline.setLatLngs(latlngs);
      model._editing = true;
    });
    newtail.on("dragend", ()=>{
      model._editing = false;
    });
    newtail.on("click", clickev => {
      ev.map.doubleClickZoom.disable();
      newtail.off("click");
      ev.onFinish();
      this._bindPopup(ev.map, model);
      this._setupHover(ev.map, model);
      ev.map.getContainer().classList.remove("leaflet-crosshair");
      setTimeout(() => { ev.map.doubleClickZoom.enable(); }, 50);
    });
  },
  annotateCancel: function (model, ev) {
    ev.map.getContainer().classList.remove("leaflet-crosshair");
    model._lineDisplay.getLatLngs().pop();
    model._lineDisplay.redraw();
    this._bindPopup(ev.map, model);
    this._setupHover(ev.map, model);
  },
  annotateMouse: function (model, ev) {
    const polyline = model._lineDisplay;
    const latlngs = [];
    for (const node of model._controlPoints.getLayers()) {
      latlngs.push(node.getLatLng());
    }
    latlngs.push(ev.latlng);
    polyline.setLatLngs(latlngs);
  },
  _getNode: function (model, idx) {
    const layers = model.getLayers();
    idx %= layers.length;
    if (idx < 0) idx = layers.length - idx;
    return layers[idx];
  },
  _bindPopup: function (map, model) {
    model.bindPopup(layer => {
      let dist = 0;
      const polyline = model._lineDisplay;
      const latlngs = polyline.getLatLngs();
      for (let i = 1; i < latlngs.length; ++i) {
        dist += map.distance(latlngs[i-1], latlngs[i]);
      }
      const container = L.DomUtil.create("div");
      const text = L.DomUtil.create("p", "", container);
      const btn = L.DomUtil.create("button", "", container);
      text.textContent = `Length: ${dist.toFixed(0)}m`;
      btn.textContent = "Delete";
      L.DomEvent.on(btn, "click", () => {
        model.remove();
        L.DomEvent.off(btn);
      });
      return container;
    });
  },
  _setupHover: function (map, model) {
    for (const node of model._controlPoints.getLayers()) {
      node.on("mouseover", ev => {
        model._editing = true;
        model._controlPoints.addTo(map);
      });
      node.on("mouseout", ev => {
        model._editing = false;
        setTimeout(()=>{
          if (!model._editing) model._controlPoints.remove();
        }, 50);
      })
    }
    model.on("mouseover", () => {
      model._editing = true;
      model._controlPoints.addTo(map);
    });
    model.on("mouseout", () => {
      model._editing = false;
      setTimeout(()=>{
        if (!model._editing) model._controlPoints.remove();
      }, 50);
    });
  }
});

L.annotate.pin = function () {
  return new L.Annotate.Pin();
}

L.annotate.polyline = function () {
  return new L.Annotate.Polyline();
}

/* Leaflet Annotation Control  */

L.Control.Annotate = L.Control.extend({
  _currentController: null,
  _currentModel: null,
  /** @type {Map<L.Layer, HTMLElement> | Map<HTMLElement, L.Layer>} */
  _controllerContainersMap: null,
  options: {
    position: "topleft",
  },
  initialize: function (widgets, opts) {
    L.Control.prototype.initialize.call(this, opts);
    this._widgetsList = widgets;
  },
  /** Setup leaflet control bar */
  onAdd: function (map) {
    this._map = map;
    const attr = "<a style='position:relative' href='https://github.com/sunsetkookaburra/maps'><img src='./res/github-mark.svg' width='10' height='10' style='position:relative;object-fit:contain;height:1em;top:0.1em'> SkAnnotate</a>";
    map.attributionControl.addAttribution(attr);
    const menu = L.DomUtil.create("div", "leaflet-bar leaflet-control");

    // Map of element<->controller map
    this._controllerContainersMap = new Map();
    for (const [label, controller] of Object.entries(this._widgetsList)) {
      const container = L.DomUtil.create("a", "skmaps-control", menu);
      container.href = "#";
      container.textContent = label;

      this._controllerContainersMap.set(controller, container);
      this._controllerContainersMap.set(container, controller);
    }
    this._onkeydown = this._onkeydown.bind(this);
    window.addEventListener("keydown", this._onkeydown);
    L.DomEvent.disableClickPropagation(menu);
    L.DomEvent.on(menu, "click", ev => ev.preventDefault());
    L.DomEvent.on(menu, "touchstart", ev => ev.preventDefault());
    L.DomEvent.on(menu, "pointerdown", ev => {
      ev.preventDefault();
      ev.target.releasePointerCapture(ev.pointerId);
    });
    L.DomEvent.on(menu, "pointerup", ev => {
      ev.preventDefault();
      ev.target.releasePointerCapture(ev.pointerId);

      // Radio Button Behaviour
      if (this._radioPop("cancel") === ev.target || ev.target == menu) {
        return;
      }

      const container = ev.target;
      const controller = this._currentController = this._controllerContainersMap.get(ev.target);
      container.classList.add("skmaps-control-active");
      this._currentModel = controller.annotateCreate({
        map,
        onFinish: () => { this._radioPop(); },
        touch: ev.pointerType != "mouse",
        latlng: this._latlng
      });
    }, this);
    map.on("click", this._onclick, this);
    map.on("mousemove", this._mousemove, this);
    return menu;
  },
  /** remove control bar */
  onRemove: function (map) {
    L.DomEvent.off(this.getContainer());
    window.removeEventListener("keydown", this._onkeydown);
    map.off("mousemove", this._mousemove, this);
    map.off("click", this._onclick, this);
  },
  _onkeydown: function (event) {
    if (event.key == "Escape") {
      this._radioPop("cancel");
    }
  },
  _onclick: function (ev) {
    this._currentController?.annotateClick(
      this._currentModel,
      Object.assign(ev, {
        onFinish: () => { this._radioPop(); },
        map: this._map,
      }),
    );
  },
  _radioPop: function (doAnnotateCancel = "") {
    const controller = this._currentController;
    this._currentController = null;
    if (controller !== null) {
      if (doAnnotateCancel === "cancel") controller.annotateCancel(this._currentModel, {
        map: this._map, latlng: this._latlng
      });
      const container = this._controllerContainersMap.get(controller);
      container.classList.remove("skmaps-control-active");
      return container;
    } else {
      return null;
    }
  },
  _mousemove: function (ev) {
    this._latlng = ev.latlng;
    this._currentController?.annotateMouse(
      this._currentModel,
      Object.assign(ev, { onFinish: () => { this._radioPop(); } }),
    );
  },
});

L.control.annotate = function (widgets, opts) {
  return new L.Control.Annotate(widgets, opts);
}
