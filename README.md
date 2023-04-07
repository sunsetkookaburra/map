# Map Annotate

## Current Features

- [x] Map pin placement
- [x] Map single-pin sharing (currently using URL query-string)
- [x] Simple poly-line drawing
  - [x] Draggable nodes
  - [x] Deletable lines
  - [ ] Extendable (continue from ends)
- [x] Selection of base layers
  - [x] OSM Standard
  - [x] NSW SIX Imagery
  - [x] NSW SIX 1943 Sydney Aerial
  - [x] ESRI Global Imagery
  - [ ] Custom tile URLs

## Ideas

- [ ] Line styles
  - [ ] Composite lines (like transport maps or simple lane markings)
- [ ] Layer groups
- [ ] Screenshot tool (via `canvas`)
  - [ ] high-resolution (css transform scale(0.5) and width 200% scaling trick or invisible map)
- [ ] Free-draw lines
- [ ] Styleable marker pins
- [ ] Routing-draw (specify start and end, preview route (graphhopper etc), confirm)
  - [ ] filter ways / nodes by tags (include/exclude)
- [ ] Drawing snap to OSM nodes (full zoom and overpass turbo)
- [ ] Drawing snap to annotations
- [ ] Line length and polygon area
- [ ] GeoJSON / geometry diffs
- [ ] splice tool
- [ ] merge node tool
- [ ] click to bring to front
- [ ] mobile / touch support (if possible)
- [ ] Saving maps
  - [ ] GeoJSON export
  - [ ] localstorage
  - [ ] server storage (self-hosted required)
- [ ] Map multiplayer / real-time (self-hosted geometry server and/or webrtc?)
  - [ ] lock on currently editing line / feature
  - [ ] author / accounts (generate short access token per-user to share, or via url, resettable)
- [ ] numbered lines by order placed (and arrows of direction)
  - [ ] segmented
- [ ] show when line drawing finishable/cancellable
- [ ] height over line over distance
- [ ] select segments for measuring or extracting to own file
- [ ] Import GeoJSON dialog

## High-DPI Demo

```js
mapEl = document.getElementById("map");
mapEl.style.transformOrigin = "top left";
mapEl.style.transform = "scale(0.5)";
mapEl.style.width = "200%";
mapEl.style.height = "200vh";
topLeft = document.querySelector(".leaflet-control-container .leaflet-top.leaflet-left");
topLeft.style.transformOrigin = "top left";
topLeft.style.transform = "scale(2)";
topRight = document.querySelector(".leaflet-control-container .leaflet-top.leaflet-right");
topRight.style.transformOrigin = "top right";
topRight.style.transform = "scale(2)";
bottomLeft = document.querySelector(".leaflet-control-container .leaflet-bottom.leaflet-left");
bottomLeft.style.transformOrigin = "bottom left";
bottomLeft.style.transform = "scale(2)";
bottomRight = document.querySelector(".leaflet-control-container .leaflet-bottom.leaflet-right");
bottomRight.style.transformOrigin = "bottom right";
bottomRight.style.transform = "scale(2)";
map.invalidateSize();
resolution = map.getSize();
```
