
document.head.insertAdjacentHTML(
  "beforeend",
`<style>
  .skmaps-control {
    font-size: 18px;
    text-shadow: 0px 2px 3px black;
    position: relative;
  }
  .skmaps-control:hover::after {
    content: attr(aria-label);
    position: absolute;
    display: inline-flex;
    box-sizing: border-box;
    height: 30px;
    background: white;
    left: 100%;
    top: 0;
    white-space: nowrap;
    font-size: 0.8rem;
    text-shadow: none;
    padding: 0 10px;
    border-bottom-right-radius: 2px;
    border-top-right-radius: 2px;
    border: 2px solid rgba(0,0,0,0.2);
    align-items: center;
    pointer-events: none;
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

// function onPolylineFeature(ctrl, feature, layer) {

// }

// Separate layers control also needed - graphical hide+show/heirarchy

// Drawing tools control

L.Control.Annotate = L.Control.extend({
  includes: L.Evented.prototype,
  options: {
    position: "topleft",
  },
  initialize (widgets, options) {
    L.Control.prototype.initialize.call(this, options);
    this._widgets = widgets;
    this._popup = L.popup();
    this._layers = L.geoJSON(undefined, {
      attribution: `<a style="position:relative" href="https://github.com/sunsetkookaburra/maps"><img src="./res/github-mark.svg" style="position:relative;object-fit:contain;height:1em;top:0.1em" width="10" height="10"> SkAnnotate</a>`,
      style: {
        weight: 5,
      },
      pointToLayer: (geoJsonPoint, latlng) => {
        return L.marker(latlng, {
          draggable: true,
          autoPan: true,
        });
      },
      onEachFeature: (feature, layer) => {
        if (layer instanceof L.Polyline) {
          new PolylineController(this, feature, layer, this._popup);
        }
        else if (layer instanceof L.Polygon) {

        }
        else if (layer instanceof L.Marker) {
          layer.annotatePlacement = (map) => {
            const eventMap = {
              mousemove: (ev) => {
                layer.setLatLng(ev.latlng);
              },
              click: (ev) => {
                layer.setLatLng(ev.latlng);
                map.off(eventMap);
              },
            };
            map.on(eventMap);
          };
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
    for (const [label, { template, desc, options }] of Object.entries(this._widgets)) {
      const widget = document.createElement("a");
      widget.className = "skmaps-control";
      widget.href = "#";
      widget.textContent = label;
      widget.setAttribute("role", "button");
      widget.setAttribute("aria-label", desc);
      L.DomEvent.disableClickPropagation(widget);
      widget.addEventListener("click", async (ev) => {
        ev.preventDefault();
        const t = template instanceof Function ? await template() : template;
        this._layers.once("layeradd", ({layer}) => {
          layer.annotatePlacement(map);
        });
        this._layers.addData(t);
        // this._lastLayer.onPlacement();
        // tool.onPlacement({
        //   ctrl: this,
        //   touch: false,
        //   latlng: this.getCoords(),
        // });
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
  constructor(ctrl, feature, layer, popup) {
    if (!(layer instanceof L.Polyline)) throw new TypeError("Expected layer instanceof L.Polyline");

    this._ctrl = ctrl;
    this._feature = feature;
    this._layer = layer;
    this._popup = popup;

    layer.annotatePlacement = () => { this.extendBack() };

    const container = document.createElement("div");
    container.insertAdjacentHTML("beforeend", `<p></p><p><button>❌</button></p>`);
    const popupContent = () => {
      const coords = layer.getLatLngs();
      let dist = 0;
      for (let i = 1; i < coords.length; ++i) {
        dist += coords[i-1].distanceTo(coords[i]);
      }
      container.querySelector("p:first-child").textContent = `Length: ${Math.round(dist)}m`;
      container.querySelector("button").onclick = () => { layer.remove(); };
      return container;
    };

    const editNodes = this._editNodes = L.layerGroup();
    for (const latlng of layer.getLatLngs()) {
      L.marker.node(latlng)
        .addTo(editNodes)
        .on("drag", ev => {
          latlng.lat = ev.latlng.lat;
          latlng.lng = ev.latlng.lng;
          layer.redraw();
        })
        // edit node context menu
        .on("contextmenu", ev => {
          popup.setContent(popupContent);
          popup.setLatLng(ev.latlng);
          popup.openOn(layer._map);
        });
    }

    layer.on("add", () => {
      editNodes.addTo(layer._map);
    });
    layer.on("remove", () => {
      editNodes.remove();
      popup.close();
    });
    // line context menu
    layer.on("contextmenu", ev => {
      popup.setContent(popupContent);
      popup.setLatLng(ev.latlng);
      popup.openOn(layer._map);
    });
  }
  extendBack() {
    console.log("LAYER BACK");
    // this._ctrl.push(); // push down radio button
    // this._ctrl.pop();
  }
  extendFront() {

  }
}

class MarkerController {

}
