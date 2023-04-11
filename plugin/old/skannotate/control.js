//@ts-check
///<reference types="../../leaflet.d.ts"/>

L.Control.Annotate = L.Control.extend({
  /** @type {Menu} */
  //@ts-ignore
  tools: null,
  /** @type {Menu} */
  //@ts-ignore
  modifiers: null,
  /** @type {L.Evented} */
  //@ts-ignore
  events: null,
  _aim: L.latLng(0, 0),
  // Config
  options: {
    position: "topleft",
  },
  /** @type {(map: L.Map) => HTMLElement} */
  onAdd(map) {
    const container = document.createElement("div");
    container.append(
      (this.tools = new Menu({
        name: "tools",
        type: "radio",
        deselectable: true,
        buttons: [
          { icon: "📍", value: "pin", title: "Pin" },
          { icon: "✏️", value: "draw", title: "Draw" },
          { icon: "🖌️", value: "brush", title: "Brush" },
          { icon: "📂", value: "import", title: "Import" },
          { icon: "📤", value: "export", title: "Export" },
        ]
      })).element,
      (this.modifiers = new Menu({
        name: "radios",
        type: "checkbox",
        buttons: [
          { icon: "🧲", value: "magnet", title: "Magnet" },
          { icon: "🔴", value: "red", title: "Mix Red" },
          { icon: "🟢", value: "green", title: "Mix Green" },
          { icon: "🔵", value: "blue", title: "Mix Blue" },
        ],
      })).element,
    );

    //@ts-ignore
    this.events = new L.Evented();

    const completeHandler = (data) => {
      this.events.off();
      this.clearCursor();
      if (data?.source != "tools") this.tools.reset();
      this.events.on("cancel", cancelHandler);
      this.events.on("complete", completeHandler);
    };
    const cancelHandler = (data) => {
      this.events.fire("complete", data);
    };
    this.events.on("cancel", cancelHandler);
    this.events.on("complete", completeHandler);

    map.on("mousemove", ev => {
      this._aim = ev.latlng;
      this.events.fire("aim", {
        latlng: ev.latlng,
      });
    });

    map.on("click", ev => {
      this.events.fire("click", {
        point: ev.containerPoint,
        touch: "TouchEvent" in window && ev.originalEvent instanceof TouchEvent,
      });
    });

    window.addEventListener("keydown", ev => {
      if (ev.key == "Escape") this.events.fire("cancel");
    });

    this.tools.on("change", ev => {
      if (ev.checked == false) {
        this.events.fire("cancel", { source: "tools" });
        return;
      }
      switch (ev.value) {
        case "pin":
          L.annotate.pin(this.getAim()).addTo(map).reposition();
          break;
        // case "draw":
        //   break;
        // case "brush":
        //   break;
        // case "import":
        //   break;
        // case "export":
        //   break;
      }
    });

    return container;
  },
  // /** @type {(map: L.Map) => void} */
  // onRemove(map) {
  // },
  getAim() {
    return this._aim;
  },
  pauseZoom() {
    this["_map"].doubleClickZoom.disable();
    setTimeout(() => {
      this["_map"].doubleClickZoom.enable()
    }, 50);
  },
  /** @param  {"crosshair"} type */
  setCursor(type) {
    switch (type) {
      case "crosshair":
        this["_map"].getContainer().classList.add("leaflet-crosshair");
        break;
    }
  },
  clearCursor() {
    this["_map"].getContainer().classList.remove("leaflet-crosshair");
  },
});

/** @param {L.ControlOptions | undefined} opts */
L.control.annotate = function (opts = undefined) {
  return new L.Control.Annotate(opts);
}

L.Map.include({
  options: {
    annotationControl: true,
  },
});

L.Map.addInitHook(function () {
  //@ts-ignore
  if (this.options.annotationControl) {
    //@ts-ignore
    this.annotationControl = L.control.annotate().addTo(this);
    //@ts-ignore
    this.attributionControl?.addAttribution(
      `<a style="position:relative" href="https://github.com/sunsetkookaburra/maps"><img src="./res/github-mark.svg" style="position:relative;object-fit:contain;height:1em;top:0.1em" width="10" height="10"> SkAnnotate</a>`
    );
  }
});
