globalThis.skmaps ??= {};

skmaps["tiles"] = {
  osm: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }),
  six: L.tileLayer("https://maps{s}.six.nsw.gov.au/arcgis/rest/services/sixmaps/LPI_Imagery_Best/MapServer/tile/{z}/{y}/{x}", {
    subdomains: "1234",
    maxZoom: 21,
    attribution: '&copy; <a href="https://maps.six.nsw.gov.au/">NSW Gov. CC-BY 4.0</a>',
  }),
  esri: L.tileLayer("https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png", {
    maxZoom: 19,
    attribution: '&copy; ESRI',
  }),
  six1943: L.tileLayer("https://maps.six.nsw.gov.au/arcgis/rest/services/sixmaps/sydney1943/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://maps.six.nsw.gov.au/">NSW Gov. CC-BY 4.0</a>',
  }),
}

