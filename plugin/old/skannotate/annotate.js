///<reference types="../leaflet.d.ts"/>

L.Annotate = {};

L.Annotate.Pin = L.Marker.extend({
  options: {
    draggable: true,
    autoPan: true,
  },
  /** @param {L.Map} map */
  onAdd(map) {
    L.Marker.prototype.onAdd.call(this, map);
    return this;
  },
  /** @param {L.Map} map */
  onRemove(map) {
    L.Marker.prototype.onRemove.call(this, map);
    return this;
  },
  reposition() {
    const orig = this.getLatLng();
    const ctrl = this._map.annotationControl;

    ctrl.setCursor("crosshair");

    ctrl.events.on({
      "aim": ({ latlng }) => {
        this.setLatLng(latlng);
      },
      "click": ({ point }) => {
        ctrl.events.fire("complete");
      },
      "cancel": () => {
        this._initial ??= true;
        if (this._initial) this.remove();
        else this._marker.setLatLng(orig);
      },
      "complete": () => {
        ctrl.pauseZoom();
      },
    });
  },
});


L.annotate = {};

L.annotate.pin = function (latlng, options) {
  return new L.Annotate.Pin(latlng, options);
}
