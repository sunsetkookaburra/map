//@ts-check
///<reference types="../leaflet.d.ts"/>

class MenuChangeEvent extends Event {
  /**
   * @param {string} value
   * @param {boolean} checked */
  constructor(value, checked) {
    super("change");
    this.value = value;
    this.checked = checked;
  }
}

class Menu {
  /**
   * Create a new RadioMenu Controller // "dialog" type
   * @param {{
   *  name: string,
   *  type: "radio"|"checkbox",
   *  horizontal?: boolean,
   *  deselectable?: boolean,
   *  buttons?: { icon: string, value: string, title: string }[]
   * }} options
   */
  constructor(options) {
    /** @type {string|null} */
    this._current = null;
    this._events = new EventTarget();
    this._type = options.type
    this._deselectable = options.deselectable || false;
    this._form = document.createElement("form");
    this._form.name = options.name;
    this._menu = document.createElement("menu");
    this._menu.className = "skmaps-menu";
    if (options.horizontal) this._menu.className += " horizontal";
    options.buttons?.forEach(this.addButton, this);
    L.DomEvent.disableClickPropagation(this._menu);
    this._form.append(this._menu);

    this._form.addEventListener("change", (ev) => {
      /** @type {string} */
      const value = ev.target?.["value"];
      // const checked = ev.target?.["checked"];
      // console.log("CHANGE", "Current:", this._current, "Change To:", value);
      if (this._current != null && this._current != value) {
        this._events.dispatchEvent(new MenuChangeEvent(this._current, false));
      }
      this._current = value;
      this._events.dispatchEvent(new MenuChangeEvent(value, ev.target?.["checked"]));
    });

    // this.on("change", ev => {
    //   /** @type {MenuChangeEvent} */
    //   //@ts-ignore
    //   const event = ev;
    //   console.log(event.value, event.checked);
    // });
  }

  get element() {
    return this._form;
  }

  addButton({ icon, value, title }) {
    const li = document.createElement("li");
    const inp = document.createElement("input");
    inp.id = `${this._form.name}-${value}`
    inp.type = this._type;
    inp.value = value;
    inp.name = this._type == "radio" ? this._form.name : inp.id;
    const lbl = document.createElement("label");
    lbl.htmlFor = inp.id;
    lbl.title = title;
    lbl.innerHTML = icon;
    li.append(inp, lbl);
    this._menu.append(li);

    if (this._type == "radio" && this._deselectable) {
      inp.addEventListener("click", ev => {
        if (this._current == inp.value) {
          this.pop(inp.value);
        }
      });
    }
  }

  // removeButton(value)

  reset() {
    for (const inp of this._form.elements) {
      if (inp["checked"]) {
        this._events.dispatchEvent(new MenuChangeEvent(inp["value"], false));
      }
    }
    this._current = null;
    this._form.reset();
  }

  /** @param {string} value */
  get(value) {
    return this._form.elements[`${this._form.name}-${value}`].checked;
  }

  /** @param {string} value */
  push(value) {
    if (!this.get(value)) {
      this._form.elements[`${this._form.name}-${value}`].click();
    }
  }

  /** @param {string} value */
  pop(value) {
    const checked = this.get(value);
    if (checked) {
      if (this._type == "radio") {
        this.reset();
      }
      else {
        this._form.elements[`${this._form.name}-${value}`].click();
      }
    }
  }

  /**
   *
   * @param {"change"} type
   * @param {(ev: MenuChangeEvent) => void} listener
   */
  on(type, listener) {
    //@ts-ignore
    this._events.addEventListener(type, listener);
  }

  /**
   *
   * @param {"change"} type
   * @param {(ev: MenuChangeEvent) => void} listener
   */
  off(type, listener) {
    //@ts-ignore
    this._events.removeEventListener(type, listener);
  }
}
