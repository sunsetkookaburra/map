
L.Control.Annotate = L.Control.extend({
  options: {
    position: "topleft",
  },
  initialize(annotators, options) {
    L.Control.prototype.initialize.call(this, options);

    this.tools = new Menu({
      name: "tools",
      type: "radio",
      deselectable: true,
    });

    this.modifiers = new Menu({
      name: "tools",
      type: "checkbox",
    });

    this._popup = L.popup({ closeButton: false, className: "skmaps-control-popup", minWidth: 0 });

    for (const annotator of annotators) {
      this.tools.addButton(annotator.prototype.TOOL);
    }
  },
  onAdd(map) {
    const container = document.createElement("div");
    container.append(this.tools.element, this.modifiers.element);

    this.tools.setUserData(map);

    map.annotationControl = this;

    const completeHandler = (data) => {
      map.annotationChannel.off();
      this.tools.reset();
      map.crosshairs.disable();
      this._map.doubleClickZoom.disable();
      setTimeout(() => { this._map.doubleClickZoom.enable() }, 50);
      map.annotationChannel.on("cancel", cancelHandler);
      map.annotationChannel.on("complete", completeHandler);
    };
    const cancelHandler = (data) => {
      map.annotationChannel.fire("complete", data);
    };
    map.annotationChannel.on("cancel", cancelHandler);
    map.annotationChannel.on("complete", completeHandler);

    this.tools.on("reset", () => {
      map.annotationChannel.fire("cancel");
    });

    map.on("aim", ev => {
      map.annotationChannel.fire("aim", ev);
    });

    map.on("click", ev => {
      map.annotationChannel.fire("click", {
        latlng: ev.latlng,
        point: ev.containerPoint,
        touch: "TouchEvent" in window && ev.originalEvent instanceof TouchEvent,
      });
    });

    window.addEventListener("keydown", ev => {
      if (ev.key == "Escape") map.annotationChannel.fire("cancel");
    });

    return container;
  },
  openContextMenu(latlng, menu) {
    this._popup.setLatLng(latlng).setContent(menu.element).openOn(this._map);
  },
});

L.control.annotate = function (annotators, options) {
  return new L.Control.Annotate(annotators, options);
}

L.Map.include({
  annotationChannel: new L.Evented(),
});

/* --- Map Aiming Handler --- */

L.Map.mergeOptions({
  aiming: true,
});

L.AimHandler = L.Handler.extend({
  addHooks() {
    this._map._aim = this._map.getCenter();
    this._map.on("mousemove", this._onMouseMove, this);
  },
  removeHooks() {
    this._map.off("mousemove", this._onMouseMove, this);
  },
  _onMouseMove(ev) {
    this._map.fire("aim", {
      latlng: this._map._aim = ev.latlng,
      point: ev.containerPoint
    });
  },
});

L.Map.addInitHook("addHandler", "aiming", L.AimHandler);

L.Map.include({
  getAim() {
    return this._aim;
  },
})

/* --- Map Crosshair Handler --- */

L.Map.mergeOptions({
  crosshairs: false,
});

L.CrosshairsHandler = L.Handler.extend({
  addHooks() {
    this._map.getContainer().classList.add("leaflet-crosshair");
  },
  removeHooks() {
    this._map.getContainer().classList.remove("leaflet-crosshair");
  },
});

L.Map.addInitHook("addHandler", "crosshairs", L.CrosshairsHandler);
