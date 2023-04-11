function html(text) {
  const template = document.createElement("template");
  template.innerHTML = text;
  return template.content;
}

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

function latLngToFeature(latlng) {
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: L.GeoJSON.latLngToCoords(latlng),
    },
  };
}

function latLngsLength(latlngs) {
  let distance = 0;
  for (let i = 1; i < latlngs.length; ++i) {
    distance += latlngs[i - 1].distanceTo(latlngs[i]);
  }
  return distance;
}

/* --- Annotation Base Mixin --- */

L.Annotate = L.Class.extend({
  _readyTool() {
    // distinguish user vs resume
    this._map.annotationChannel.fire("cancel");
    this._map.annotationControl.tools.select(this.TOOL.value);
    this._map.crosshairs.enable();
  },
});

L.Annotate.Pin = L.Marker.extend({
  includes: L.Annotate.prototype,
  TOOL: {
    icon: "📍", value: "pin", title: "Pin a marker.",
    userselect: map => {
      new L.Annotate.Pin(latLngToFeature(map.getAim())).addTo(map).reposition();
    },
  },
  MODIFIERS: [
    { icon: "🧲", value: "magnet", title: "Snap on points." },
  ],
  initialize(feature) {
    // Setup Leaflet Layer
    L.Marker.prototype.initialize.call(
      this,
      L.GeoJSON.coordsToLatLng(feature.geometry.coordinates),
      {
        draggable: true,
        autoPan: false,
      },
    );
    this.on("contextmenu", ev => {
      this._map.annotationControl.openContextMenu(ev.latlng, new Menu({
        name: "draw",
        type: "dialog",
        horizontal: true,
        buttons: [
          {
            icon: "&#x2139;&#xfe0f;", value: "info", title: "Info",
            userselect: async () => {
              const content = html(`
                <p>
                  Lat: ${L.Util.formatNum(this.getLatLng().lat)}
                  <br/>
                  Lng: ${L.Util.formatNum(this.getLatLng().lng)}
                </p>
                <p><button value="delete">🗑️ Delete</button></p>
              `);
              switch (await this._map.annotationControl.openModal("Pin Info", content)) {
                case "delete":
                  this.remove();
                  break;
              }
            },
          },
          {
            icon: "🗑️", value: "delete", title: "Delete",
            userselect: async () => {
              this.remove();
            },
          },
        ],
      }));
    });
  },
  // onAdd(map) {
  //   // Leaflet Layer Add
  //   L.Marker.prototype.onAdd.call(this, map);
  //   // Add interactivity/styling layers etc
  //   return this;
  // },
  reposition() {
    const orig = this.getLatLng();
    this._readyTool();
    this._map.annotationChannel.on({
      "aim": ({ latlng }) => {
        this.setLatLng(latlng);
      },
      "click": ({ point }) => {
        this._map.annotationChannel.fire("complete");
      },
      "cancel": () => {
        this._initial ??= true;
        if (this._initial) this.remove();
        else this.setLatLng(orig);
        this._initial = false;
      },
    });
  },
});

/* --- Line Drawing Tool --- */

L.Annotate.Draw = L.Polyline.extend({
  includes: L.Annotate.prototype,
  TOOL: {
    icon: "✏️", value: "draw", title: "Draw some lines.",
    userselect: map => {
      new L.Annotate.Draw({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      }).addTo(map).extendBack();
    },
  },
  MODIFIERS: [
    { icon: "🧲", value: "magnet", title: "Snap on points." },
  ],
  initialize(feature) {
    // Setup Leaflet Layer
    L.Polyline.prototype.initialize.call(
      this,
      L.GeoJSON.coordsToLatLngs(feature.geometry.coordinates),
      {
        weight: 8,
      },
    );
    this.on("contextmenu", ev => {
      this._map.annotationControl.openContextMenu(ev.latlng, new Menu({
        name: "draw",
        type: "dialog",
        horizontal: true,
        buttons: [
          {
            icon: "&#x2139;&#xfe0f;", value: "info", title: "Info",
            userselect: async () => {
              const content = html(`
                <p>Length: ${Math.round(latLngsLength(this.getLatLngs()))}m</p>
                <p><button value="delete">🗑️ Delete</button></p>
              `);
              switch (await this._map.annotationControl.openModal("Drawing Info", content)) {
                case "delete":
                  this.remove();
                  break;
              }
            },
          },
          {
            icon: "🗑️", value: "delete", title: "Delete",
            userselect: async () => {
              this.remove();
            },
          },
        ],
      }));
    });
  },
  onAdd(map) {
    // Leaflet Layer Add
    L.Polyline.prototype.onAdd.call(this, map);
    // Add interactivity/styling layers etc
    this._editNodes = L.featureGroup();
    for (const latlng of this.getLatLngs()) {
      L.marker.node(latlng).addTo(this._editNodes).on("drag", ev => {
        latlng.lat = ev.lat;
        latlng.lng = ev.lng;
      });
    }
    this._editNodes.addTo(map);
    return this;
  },
  onRemove(map) {
    L.Polyline.prototype.onRemove.call(this, map);
    this._editNodes.remove();
  },
  extendBack() {
    let preview = false;

    this._readyTool();
    this._map.annotationChannel.on({
      "aim": ({ latlng }) => {
        if (this.getLatLngs().length > 0) {
          if (preview) this.getLatLngs().pop();
          this.addLatLng(latlng);
          preview = true;
        }
      },
      "click": ({ latlng, point }) => {
        if (preview) {
          this.getLatLngs().pop();
          preview = false;
        }
        if (this.getTail() && this._map.latLngToContainerPoint(this.getTail()).distanceTo(point) < 6) {
          this._map.annotationChannel.fire("complete");
        } else {
          this.addLatLng(latlng);
          L.marker.node(latlng).addTo(this._editNodes).on("drag", ev => {
            latlng.lat = ev.latlng.lat;
            latlng.lng = ev.latlng.lng;
            this.redraw();
          });
        }
      },
      "cancel": () => {
        if (preview) {
          this.getLatLngs().pop();
          this.redraw();
        }
        if (this.getLatLngs().length < 2) {
          this.remove();
        }
      },
    });
  },
  getHead() {
    return this.getLatLngs()[0];
  },
  getTail() {
    const latlngs = this.getLatLngs();
    return latlngs[latlngs.length - 1];
  },
});
