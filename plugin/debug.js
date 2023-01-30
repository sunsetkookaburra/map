document.head.insertAdjacentHTML(
  "beforeend",
  `<style>
  .skmaps-debug {
    background-color: #fff7;
    border-radius: 0.2rem;
    padding: 0.3rem 0.5rem;
  }
  .skmaps-debug samp {
    display: block;
    width: min(60ch, 90vw);
    height: 30ch;
    overflow-y: scroll;
  }
</style>`
);

L.Control.Debug = L.Control.extend({
  options: {
    position: "bottomright"
  },
  onAdd: function (map) {
    const pre = L.DomUtil.create("pre", "skmaps-debug");
    const samp = L.DomUtil.create("samp", "", pre);
    L.DomEvent.disableScrollPropagation(pre);
    return pre;
  },
  log: function (...data) {
    this.getContainer().children[0].textContent += data.map(String).join(" ") + "\n";
  }
});

L.control.debug = function (opts) {
  return new L.Control.Debug(opts);
}
