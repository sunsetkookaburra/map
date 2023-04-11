
class MenuEvent extends Event {
  /**
   *
   * @param {"select" | "deselect" | "reset"} type
   * @param {string} value
   * @param {boolean} wasUser
   */
  constructor(type, value, wasUser) {
    super(type);
    this.value = value;
    this.wasUser = wasUser;
  }
}

// "buttons" type for dialogs or similar
class Menu {
  /**
   * Create a new RadioMenu Controller
   * @param {{
   *  name: string,
   *  type: "radio"|"checkbox"|"dialog",
   *  horizontal?: boolean,
   *  deselectable?: boolean,
   *  userData?: any,
   *  buttons?: { icon: string, value: string, title: string, userselect?: (data: any) => void, userdeselect?: (data: any) => void }[]
   * }} options
   */
  constructor(options) {
    /** @type {HTMLInputElement|number|null} */
    this._current = options.type == "checkbox" ? 0 : null;
    this._events = new EventTarget();
    this._userData = options.userData;
    this._type = options.type
    this._deselectable = options.deselectable || false;
    this._form = document.createElement("form");
    this._form.name = options.name;
    this._menu = document.createElement("menu");
    this._menu.className = "skmaps-menu";
    if (options.horizontal) this._menu.className += " horizontal";
    if (this._type == "dialog") this._form.method = "dialog";

    if (this._type == "dialog") {
      this._root = document.createElement("dialog");
      this._root.appendChild(this._form);
    } else {
      this._root = this._form;
    }

    if (options.buttons !== undefined) {
      for (const b of options.buttons) {
        this.addButton(b);
      }
    } else {
      this._root.hidden = true
    }

    L.DomEvent.disableClickPropagation(this._menu);
    this._form.append(this._menu);

    // this.on("select", ev => console.log(ev.type, ev.value, ev.wasUser));
    // this.on("deselect", ev => console.log(ev.type, ev.value, ev.wasUser));
    // this.on("reset", ev => console.log(ev.type, ev.value, ev.wasUser));
  }

  get element() {
    return this._root;
  }

  addButton({ icon, value, title, userselect, userdeselect }) {
    this._root.hidden = false;
    const li = document.createElement("li");

    if (this._type == "dialog") {
      const btn = document.createElement("button");
      btn.id = `${this._form.name}-${value}`;
      btn.name = btn.id;
      btn.value = value;
      btn.title = title;
      btn.innerHTML = icon;
      li.append(btn);
      btn.addEventListener("click", ev => {
        this._events.dispatchEvent(new MenuEvent("select", value, true));
        userselect?.call(undefined, this._userData);
        this._events.dispatchEvent(new MenuEvent("reset", value, true));
      });
      this._menu.append(li);
      return;
    }

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

    inp.addEventListener("click", ev => {
      ev.preventDefault()
    });

    if (this._type == "checkbox") {
      li.addEventListener("pointerup", ev => {
        li.releasePointerCapture(ev.pointerId);
        const currentState = inp.checked;
        const newState = !currentState;
        inp.checked = newState;
        if (newState) ++this._current; else --this._current;
        this._events.dispatchEvent(new MenuEvent(newState ? "select" : "deselect", value, true));
        if (newState) {
          userselect?.call(undefined, this._userData);
        }
        else {
          userdeselect?.call(undefined, this._userData);
        }
        if (this._current == 0) {
          this._events.dispatchEvent(new MenuEvent("reset", "", true));
        }
      });
    } else {
      li.addEventListener("pointerup", ev => {
        li.releasePointerCapture(ev.pointerId);
        if (this._current == inp) {
          if (this._deselectable) {
            inp.checked = false;
            this._events.dispatchEvent(new MenuEvent("deselect", this._current.value, true));
            userdeselect?.call(undefined, this._userData);
            this._events.dispatchEvent(new MenuEvent("reset", "", true));
            this._current = null;
          }
        } else {
          if (this._current !== null) {
            this._current.checked = false;
            this._events.dispatchEvent(new MenuEvent("deselect", this._current.value, true));
            userdeselect?.call(undefined, this._userData);
          }
          inp.checked = true;
          this._current = inp;
          this._events.dispatchEvent(new MenuEvent("select", this._current.value, true));
          userselect?.call(undefined, this._userData);
        }
      });
    }
  }

  setUserData(data) {
    this._userData = data;
  }

  select(value) {
    if (this._type == "checkbox") {
      for (const val of value) {
        const inp = this._form.elements[`${this._form.name}-${val}`];
        if (inp) {
          inp.checked = true;
          ++this._current;
          this._events.dispatchEvent(new MenuEvent("select", inp.value, false));
        }
      }
    } else {
      const inp = this._form.elements[`${this._form.name}-${value}`];
      if (inp) {
        inp.checked = true;
        this._current = inp;
        this._events.dispatchEvent(new MenuEvent("select", inp.value, false));
      }
    }
  }

  deselect(value) {
    if (this._type == "checkbox") {
      for (const val of value) {
        const inp = this._form.elements[`${this._form.name}-${val}`];
        if (inp) {
          inp.checked = false;
          --this._current;
          this._events.dispatchEvent(new MenuEvent("deselect", inp.value, false));
        }
      }
    } else {
      const inp = this._form.elements[`${this._form.name}-${value}`];
      if (inp && inp.checked) {
        inp.checked = false;
        this._current = null;
        this._events.dispatchEvent(new MenuEvent("deselect", inp.value, false));
      }
    }
  }

  reset() {
    this._form.reset();
    if (this._type == "checkbox") {
      this._current = 0;
    } else {
      this._current = null;
    }
    this._events.dispatchEvent(new MenuEvent("reset", "", false));
  }

  clearButtons() {
    this._menu.replaceChildren();
    this._root.hidden = true;
  }

  /**
   *
   * @param {"select" | "deselect" | "reset"} type
   * @param {(ev: MenuEvent) => void} listener
   */
  on(type, listener) {
    //@ts-ignore
    this._events.addEventListener(type, listener);
  }
}

// function replaceElementChildren(element, content) {
//   element.replaceChildren();
//   if (typeof content === "string") {
//     element.insertAdjacentHTML("beforeend", content);
//   } else {
//     element.append(content);
//   }
// }

// class ModalDialog {
//   constructor() {
//     this._dialog = document.createElement("dialog");
//     this._dialog.className = "skmaps-dialog";
//     this._heading = document.createElement("h2");
//     this._closeButton = document.createElement("button");
//     this._closeButton.textContent = "X";
//     this._closeButton.addEventListener("click", () => {
//       this._dialog.dispatchEvent(new Event("cancel"));
//       this._dialog.close();
//     });
//     this._form = document.createElement("form");
//     this._form.method = "dialog";

//     this._dialog.append(this._heading, this._closeButton, this._form);
//   }

//   get element() {
//     return this._dialog;
//   }

//   open(heading, content) {
//     replaceElementChildren(this._heading, heading);
//     replaceElementChildren(this._form, content);
//     this._dialog.showModal();
//     const controller = new AbortController();
//     const signal = controller.signal;
//     return new Promise(resolve => {
//       this._dialog.addEventListener("cancel", () => {
//         controller.abort();
//         resolve(null);
//       }, { signal });
//       this._dialog.addEventListener("close", () => {
//         controller.abort();
//         resolve(this._dialog.returnValue);
//       }, { signal });
//     });
//   }
// }
