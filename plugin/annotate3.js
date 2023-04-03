
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
});

L.marker.node = function (latlng, opts) {
  return new L.Marker.Node(latlng, opts);
}

L.Control.Annotate = L.Control.extend({
  includes: L.Evented.prototype,
  options: {
    position: "topleft",
  },
  initialize (widgets, options) {
    L.Control.prototype.initialize.call(this, options);
    this._widgets = widgets;
    this._layers = L.geoJSON(undefined, {
      style: {
        weight: 5,
      },
      onEachFeature: (feature, layer) => {
        if (layer instanceof L.Polyline) {
          const editNodes = L.layerGroup();
          const popup = L.popup();
          const container = document.createElement("div");
          {
            const coords = layer.getLatLngs();
            let dist = 0;
            for (let i = 1; i < coords.length; ++i) {
              dist += coords[i-1].distanceTo(coords[i]);
            }
            const info = document.createElement("p");
            info.insertAdjacentHTML("beforeend", `Length: ${Math.round(dist)}m`);
            const remove = document.createElement("button");
            remove.textContent = "❌";
            remove.onclick = () => { layer.remove() };
            container.appendChild(info);
            container.appendChild(remove);
          }

          function redraw() {
            layer.setLatLngs(editNodes.getLayers().map(l => l.getLatLng()));
          }

          layer.on("add", () => {
            for (const latlng of layer.getLatLngs()) {
              L.marker.node(latlng)
                .addTo(editNodes)
                .on("drag", redraw)
                .on("contextmenu", ev => {
                  popup.setContent("EDIT NODE");
                  popup.setLatLng(ev.latlng);
                  popup.openOn(layer._map);
                });
            }
            editNodes.addTo(layer._map);
          });

          layer.on("remove", () => {
            editNodes.remove();
            popup.close();
          });

          layer.on("contextmenu", ev => {
            popup.setContent(container);
            popup.setLatLng(ev.latlng);
            popup.openOn(layer._map);
          });
        }
        else if (layer instanceof L.Polygon) {

        }
        else if (layer instanceof L.Marker) {

        }
        // recurse
        else if (layer instanceof L.FeatureGroup) {

        }
      }
    });
  },
  onAdd(map) {
    this._layers.addTo(map);

    /** UI Elements */
    const panel = document.createElement("div");
    panel.className = "leaflet-bar leaflet-control";
    for (const [label, { template, options }] of Object.entries(this._widgets)) {
      const widget = document.createElement("a");
      widget.className = "skmaps-control";
      widget.href = "#";
      widget.textContent = label;
      widget.addEventListener("click", (ev) => {
        ev.preventDefault();
        L.DomEvent.stopPropagation(ev);
        this._layers.addData(template);
        // const tool = factory(this, options);
        // this._tools.set(tool.addTo(map), widget);
        // tool.onPlacement({
        //   ctrl: this,
        //   touch: false,
        //   latlng: this.getCoords(),
        // });
        // globalThis.LAST_TOOL = tool;
      });
      panel.appendChild(widget);
    }

    return panel;
  },
  onRemove(map) {
    this._layers.remove();
  },
});

L.control.annotate = function (widgets, options) {
  return new L.Control.Annotate(widgets, options);
}

class PolylineController {
  constructor(control, feature, layer) {
    this._control = control;
    this._feature = feature;
    this._layer = layer;
  }
  extendBack() {

  }
  extendFront() {

  }
}
