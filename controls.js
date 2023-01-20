L.NodeMarker = L.Marker.extend({
  options: {
    // icon: L.icon({ iconUrl: `node-small.svg`, iconSize: L.point(10, 10) }),
    icon: new L.Icon.Default(),
    draggable: true,
    autoPan: true,
  }
});

L.nodeMarker = function (latlng, opts) {
  return new L.NodeMarker(latlng, opts).bindPopup(marker => {
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

L.Control.Drawing = L.Control.extend({
  options: {
    position: "topleft",
  },
  onAdd: function (map) {
    const menu = L.DomUtil.create("div", "leaflet-bar leaflet-control");
    // const home = L.DomUtil.create("a", "skmaps-control-home", menu);
    // home.href = "#home";
    // home.title = "Home";
    // home.textContent = "🏠";
    const point = L.DomUtil.create("a", "skmaps-control-point", menu);
    point.href = "#point";
    point.title = "Point";
    point.textContent = "📍";

    // responsible for resetting to null
    let onCancel = null;
    let state = null;

    function escCancel(event) {
      if (event.originalEvent.key == "Escape") onCancel?.(state);
    }

    L.DomEvent.disableClickPropagation(menu);
    map.on("keydown", escCancel);

    L.DomEvent.on(menu, "pointerdown", ev => {
      // cancel current
      onCancel?.(state);
      // activate new
      // ev.target.releasePointerCapture(ev.pointerId);
      if (ev.target == point) pointStart(ev.pointerType != "mouse");
    });

    // // L.DomEvent.disableClickPropagation(home);
    // // L.DomEvent.on(home, "click", function (ev) {
    // //   ev.preventDefault();
    // //   window.location = window.location.pathname;
    // // });

    function pointStart(touch = false) {
      // Point initial placement dependent on input method
      // Touch: Place centre to be moved later
      // Mouse: Move cursor and click to place
      const origin = touch ? map.getCenter() : MOUSE;
      // Common point
      state = { node: L.nodeMarker(origin, { interactive: false }).addTo(map) };

      if (touch) {
        pointComplete()
        return;
      }

      state.node.options.interactive = false;
      point.classList.add("skmaps-control-active");
      onCancel = pointCancel;
      map.on("click", pointComplete);
      map.on("mousemove", pointUpdate);
    }

    function pointUpdate() {
      state.node.setLatLng(MOUSE);
    }

    function pointComplete() {
      const pos = state.node.getLatLng();
      pointCancel();
      L.nodeMarker(pos).addTo(map);
    }

    function pointCancel() {
      map.off("click", pointComplete);
      map.off("mousemove", pointUpdate);
      state.node.remove();
      onCancel = null;
      state = null;
      point.classList.remove("skmaps-control-active");
    }

    // function lineStart(event) {

    // }

    // function lineUpdate(state) {

    // }

    // function lineCancel(state) {

    // }

    // function lineComplete(state) {

    // }

    // function cancelPoint() {
    //   map.off("mousemove", moveState);
    //   point.classList.remove("skmaps-control-active");
    //   state.remove();
    //   state = null;
    // }

    // function moveState() {
    //   state.setLatLng(MOUSE);
    // }

    // L.DomEvent.disableClickPropagation(point);
    // L.DomEvent.on(point, "click touchend", function (ev) {
    //   ev.preventDefault();

    //   cancelState?.();
    //   if (cancelState === cancelPoint) {
    //     cancelState = null;
    //     return;
    //   }

    //   if (ev instanceof TouchEvent) {
    //     L.marker(map.getCenter(), {
    //       draggable: true,
    //       autoPan: true,
    //     }).bindPopup((marker) => {
    //       const { lat, lng } = marker.getLatLng();
    //       const div = L.DomUtil.create("div");
    //       div.insertAdjacentHTML("afterbegin", `<a href="?lat=${roundPlaces(lat, 6)}&lon=${roundPlaces(lng, 6)}"><span style="user-select:none">Lat: </span>${roundPlaces(lat, 6)},<br/><span style="user-select:none">Lon: </span>${roundPlaces(lng, 6)}</a><br/><br/>`);
    //       const a = L.DomUtil.create("a", "", div);
    //       a.href = "#remove";
    //       a.textContent = "Remove";
    //       L.DomEvent.on(a, "click", function (ev) {
    //         ev.preventDefault();
    //         L.DomEvent.off(a);
    //         marker.remove();
    //       });
    //       return div;
    //     }).addTo(map);
    //     return;
    //   }

    //   cancelState = cancelPoint;

    //   point.classList.add("skmaps-control-active");
    //   state = L.marker(MOUSE, {
    //     draggable: true,
    //     autoPan: true,
    //   });
    //   map.on("mousemove", moveState);
    //   function plop() {
    //     map.off("mousemove", moveState);
    //     map.off("click", plop);
    //     point.classList.remove("skmaps-control-active");
    //     cancelState = null;
    //     state = null;
    //   }
    //   map.on("click", plop);
    //   state.addTo(map);


    //   state.bindPopup((marker) => {
    //     const { lat, lng } = marker.getLatLng();
    //     const div = L.DomUtil.create("div");
    //     div.insertAdjacentHTML("afterbegin", `<a href="?lat=${roundPlaces(lat, 6)}&lon=${roundPlaces(lng, 6)}"><span style="user-select:none">Lat: </span>${roundPlaces(lat, 6)},<br/><span style="user-select:none">Lon: </span>${roundPlaces(lng, 6)}</a><br/><br/>`);
    //     const a = L.DomUtil.create("a", "", div);
    //     a.href = "#remove";
    //     a.textContent = "Remove";
    //     L.DomEvent.on(a, "click", function (ev) {
        //   ev.preventDefault();
        //   L.DomEvent.off(a);
        //   marker.remove();
        // });
        // return div;
      // });
    // });
    // const line = L.DomUtil.create("a", "skmaps-control-line", menu);
    // line.href = "#";
    // line.title = "Line";
    // line.textContent = "✏️";
    return menu;
  },
  onRemove: function (map) {
    for (const child of this.getContainer()) {
      L.DomEvent.off(child);
    }
  }
});

L.control.drawing = function (opts) {
  return new L.Control.Drawing(opts);
}
