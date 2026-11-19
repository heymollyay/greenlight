/* GreenLight — site interactions + demo ride board.
   Everything here is client-side only; rides are stored in localStorage
   so the board can later be wired to a real backend (see RideStore). */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- chip-in guide (edit these in one place) ----------
     About $10 per hour of driving per seat, rounded to the nearest $5,
     never less than $5 (campus commute $5, 1 hr $10, 2 hr $20). */
  const CHIP_IN = { perHour: 10, minimum: 5, roundTo: 5 };
  const suggestChipIn = (driveMinutes) =>
    Math.max(CHIP_IN.minimum, Math.round(((driveMinutes / 60) * CHIP_IN.perHour) / CHIP_IN.roundTo) * CHIP_IN.roundTo);

  const ICONS = {
    grocery: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
    airport: '<path d="M10.5 13.5 4 11l1.5-1.5 7 1 4-4c.8-.8 2.2-.8 3 0s.8 2.2 0 3l-4 4 1 7L15 22l-2.5-6.5-3 3V21l-1.5 1-1-3-3-1L5 16.5h2.5z"/>',
    hometown: '<path d="M3 10.5 12 3l9 7.5V21H3z"/><path d="M9.5 21v-6h5v6"/>',
    campus: '<path d="M2 9.5 12 4l10 5.5L12 15z"/><path d="M6 11.7V17c3.5 2.5 8.5 2.5 12 0v-5.3"/>',
  };
  const TYPE_LABEL = { grocery: "Groceries", airport: "Airport", hometown: "Hometown", campus: "Campus" };
  const icon = (type) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[type] || ""}</svg>`;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- toast ---------- */
  const toastEl = $(".toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 4000);
  }

  /* ---------- year ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- full-screen menu ---------- */
  const menu = $("#menu");
  const menuBtn = $("[data-menu-open]");
  function openMenu() {
    menu.hidden = false;
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    menuBtn.setAttribute("aria-expanded", "true");
    $(".menu__close", menu).focus();
  }
  function closeMenu(returnFocus = true) {
    menu.hidden = true;
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener("click", openMenu);
  $("[data-menu-close]").addEventListener("click", () => closeMenu());
  $$(".menu__nav a").forEach((a) => a.addEventListener("click", () => closeMenu(false)));
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return closeMenu();
    if (e.key !== "Tab") return;
    const f = $$("a, button", menu);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- hero video ---------- */
  const video = $(".hero__video");
  const vidBtn = $("[data-video-toggle]");
  const vidLabel = $(".hero__pause-label");
  let userPaused = false;
  function setVideo(play) {
    if (!video) return;
    if (play) video.play().catch(() => {});
    else video.pause();
    vidBtn.setAttribute("aria-pressed", String(!play));
    vidLabel.innerHTML = play ? 'Pause <span class="script">video</span>' : 'Play <span class="script">video</span>';
  }
  if (reduceMotion.matches) { userPaused = true; video.removeAttribute("autoplay"); setVideo(false); }
  vidBtn.addEventListener("click", () => { userPaused = !video.paused ? true : false; setVideo(video.paused); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      if (userPaused) return;
      entry.isIntersecting ? video.play().catch(() => {}) : video.pause();
    }, { threshold: 0.1 }).observe(video);
  }

  /* ---------- tabs (how it works) ---------- */
  const tabs = $$(".tab");
  function selectTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  /* ---------- destinations ---------- */
  const DESTS = {
    grocery: {
      eyebrow: "Weekly", name: "Grocery Runs", img: "assets/img/backseat-smiles.webp",
      copy: "No car, no problem. Hop in with someone already heading down Richmond Road or Monticello Ave for the weekly stock-up.",
      trip: "5–15 min", price: `$${suggestChipIn(15)} / seat`, cta: "See grocery rides",
    },
    airport: {
      eyebrow: "Breaks & long weekends", name: "The Airport", img: "assets/img/driver-view.webp",
      copy: "Skip the $60+ ride-hail. Share a car to Richmond (RIC), Newport News (PHF) or Norfolk (ORF), and to D.C. airports around breaks.",
      trip: "20 min – 2.5 hr", price: `$${suggestChipIn(20)}–${suggestChipIn(165)} / seat`, cta: "See airport rides",
    },
    hometown: {
      eyebrow: "Fall, Thanksgiving & spring break", name: "Hometowns", img: "assets/img/coast-drive.webp",
      copy: "NoVA, Richmond, Virginia Beach, Charlottesville and beyond. Someone from your hometown is already making the drive.",
      trip: "1 – 4 hr", price: `$${suggestChipIn(60)}–${suggestChipIn(240)} / seat`, cta: "See hometown rides",
    },
    campus: {
      eyebrow: "Every weekday", name: "Campus Commute", img: "assets/img/friends-window.webp",
      copy: "Living off campus? Share the daily drive to class and the hunt for a parking spot with neighbors on the same schedule.",
      trip: "5–15 min", price: `$${suggestChipIn(10)} / seat`, cta: "See commute rides",
    },
  };
  const destCard = $(".dest__card");
  function showDest(key) {
    const d = DESTS[key];
    $$(".dest__item").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dest === key)));
    const apply = () => {
      $(".dest__img", destCard).src = d.img;
      $(".dest__eyebrow", destCard).textContent = d.eyebrow;
      $(".dest__name", destCard).textContent = d.name;
      $(".dest__copy", destCard).textContent = d.copy;
      $(".dest__trip", destCard).textContent = d.trip;
      $(".dest__price", destCard).textContent = d.price;
      const cta = $(".dest__cta", destCard);
      cta.textContent = d.cta;
      cta.dataset.filterLink = key;
      destCard.classList.remove("is-swapping");
    };
    if (reduceMotion.matches) return apply();
    destCard.classList.add("is-swapping");
    setTimeout(apply, 160);
  }
  $$(".dest__item").forEach((b) => {
    b.addEventListener("click", () => showDest(b.dataset.dest));
    b.addEventListener("mouseenter", () => { if (window.matchMedia("(hover: hover)").matches) showDest(b.dataset.dest); });
  });
  // initialise price text from the shared formula
  $(".dest__price", destCard).textContent = DESTS.grocery.price;

  /* ---------- route map ---------- */
  const PINS = {
    ric: { name: "Richmond · RIC", miles: 45, mins: 50, time: "50 min", copy: "Richmond International: the go-to airport for breaks, plus everything in RVA." },
    nova: { name: "NoVA & D.C.", miles: 150, mins: 165, time: "2 hr 45 min", copy: "Home for a huge chunk of the Tribe, plus Dulles and Reagan National airports." },
    cville: { name: "Charlottesville", miles: 115, mins: 120, time: "2 hr", copy: "Weekend visits, game days and the drive west toward the Blue Ridge." },
    phf: { name: "Newport News · PHF", miles: 15, mins: 20, time: "20 min", copy: "Newport News/Williamsburg International, the closest airport to campus." },
    orf: { name: "Norfolk · ORF", miles: 45, mins: 50, time: "50 min", copy: "Norfolk International, with more direct flights south and to the Northeast." },
    vb: { name: "Virginia Beach", miles: 60, mins: 70, time: "1 hr 10 min", copy: "Hometown trips and warm-weather beach days on the oceanfront." },
    grocery: { name: "Grocery stores", miles: 4, mins: 10, time: "10 min", copy: "Richmond Road and Monticello Ave: the weekly stock-up, minus the bus schedule." },
  };
  const explored = new Set();
  const mapCard = $(".map__card");
  $(".map__total").textContent = Object.keys(PINS).length;
  $$(".pin").forEach((pin) => {
    const key = pin.dataset.pin;
    pin.setAttribute("aria-pressed", "false");
    pin.setAttribute("aria-label", `${PINS[key].name}: show route details`);
    pin.addEventListener("click", () => {
      explored.add(key);
      $$(".pin").forEach((p) => {
        p.setAttribute("aria-pressed", String(p === pin));
        p.classList.toggle("is-explored", explored.has(p.dataset.pin));
      });
      $$(".map__routes path").forEach((r) => {
        r.classList.toggle("is-active", r.dataset.route === key);
        r.classList.toggle("is-explored", explored.has(r.dataset.route));
      });
      const p = PINS[key];
      $(".map__card-title", mapCard).textContent = p.name;
      $(".map__card-copy", mapCard).innerHTML =
        `${esc(p.copy)}<span class="map__stats"><span><b>~${p.miles} mi</b></span><span><b>${esc(p.time)}</b> drive</span><span>Chip-in <b>~$${suggestChipIn(p.mins)}</b>/seat</span></span>`;
      $(".map__count").textContent = explored.size;
      if (explored.size === Object.keys(PINS).length) toast("You explored every route. Time to book one!");
    });
  });

  /* ---------- ride store (swap for an API later) ---------- */
  const STORE_KEY = "greenlight-demo-v2";
  const RideStore = {
    load() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (_) { /* storage unavailable */ }
      return null;
    },
    save(state) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
    },
    clear() { try { localStorage.removeItem(STORE_KEY); } catch (_) { /* ignore */ } },
  };

  function seedRides() {
    const at = (days, hhmm) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      const [h, m] = hhmm.split(":").map(Number);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };
    const r = (id, type, from, to, pickup, dropoff, days, time, seats, taken, price, driver, year) =>
      ({ id, type, from, to, pickup, dropoff, when: at(days, time), seats, taken, price, driver, year });
    return [
      r("s1", "grocery", "W&M campus", "Monticello Marketplace", "Sadler Center loop", "Main entrance", 1, "10:30", 3, 1, 5, "Maya R.", "'27"),
      r("s2", "campus", "Midtown Row", "W&M campus", "Midtown Row front entrance", "Sadler Center", 1, "08:40", 2, 1, 5, "Ethan K.", "'27"),
      r("s3", "airport", "W&M campus", "Richmond Airport (RIC)", "Yates Hall lot", "Departures curb", 2, "06:15", 3, 0, 10, "Jordan T.", "'26"),
      r("s4", "airport", "W&M campus", "Newport News Airport (PHF)", "Barrett Hall", "Departures curb", 3, "07:30", 3, 2, 5, "Noah B.", "'28"),
      r("s5", "hometown", "W&M campus", "Virginia Beach", "Zable Stadium lot", "Town Center", 3, "17:30", 3, 1, 10, "Lena W.", "'26"),
      r("s6", "hometown", "W&M campus", "Fairfax, VA (NoVA)", "Zable Stadium lot", "Fair Oaks Mall", 4, "15:00", 4, 2, 30, "Priya S.", "'28"),
      r("s7", "airport", "W&M campus", "Norfolk Airport (ORF)", "Sadler Center loop", "Departures curb", 5, "13:00", 2, 0, 10, "Sam O.", "'29"),
      r("s8", "grocery", "W&M campus", "Richmond Rd grocery stores", "Swem Library circle", "Store entrances", 6, "18:00", 3, 0, 5, "Chris P.", "'28"),
      r("s9", "hometown", "W&M campus", "Charlottesville", "Kaplan Arena lot", "The Corner", 7, "12:00", 2, 0, 20, "Ava M.", "'27"),
      r("s10", "campus", "Williamsburg Transportation Ctr", "W&M campus", "Amtrak station pickup", "Sadler Center", 8, "19:00", 3, 1, 5, "Grace L.", "'26"),
    ];
  }

  let state = RideStore.load() || { rides: seedRides(), requests: {} };
  RideStore.save(state);

  const filters = { type: "all", q: "", when: "any" };
  const ridesEl = $(".rides");
  const emptyEl = $(".empty");
  const countEl = $(".board__count");

  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  function dayLabel(d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const that = new Date(d); that.setHours(0, 0, 0, 0);
    const diff = Math.round((that - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return dayFmt.format(d);
  }

  function matchesWhen(d) {
    if (filters.when === "any") return true;
    const now = new Date();
    if (filters.when === "weekend") {
      const sat = new Date(now); sat.setHours(0, 0, 0, 0);
      sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7));
      const monday = new Date(sat); monday.setDate(sat.getDate() + 2);
      const fri = new Date(sat); fri.setDate(sat.getDate() - 1); fri.setHours(12);
      return d >= (now > fri ? now : fri) && d < monday;
    }
    const limit = new Date(now); limit.setDate(limit.getDate() + Number(filters.when));
    return d <= limit;
  }

  function visibleRides() {
    const now = Date.now() - 60 * 60 * 1000;
    const q = filters.q.trim().toLowerCase();
    return state.rides
      .filter((r) => new Date(r.when).getTime() >= now)
      .filter((r) => filters.type === "all" || r.type === filters.type)
      .filter((r) => matchesWhen(new Date(r.when)))
      .filter((r) => !q || [r.to, r.from, r.pickup, r.dropoff, r.driver, TYPE_LABEL[r.type]].join(" ").toLowerCase().includes(q))
      .sort((a, b) => new Date(a.when) - new Date(b.when));
  }

  function rideCard(r) {
    const d = new Date(r.when);
    const open = Math.max(0, r.seats - r.taken);
    const requested = !!state.requests[r.id];
    const seatIcons = Array.from({ length: r.seats }, (_, i) =>
      `<span class="seat${i >= r.taken ? " seat--open" : ""}"></span>`).join("");
    let action;
    if (requested) action = `<button class="btn btn--sm is-requested" type="button" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Requested</button>`;
    else if (!open) action = `<button class="btn btn--sm" type="button" disabled>Full</button>`;
    else action = `<button class="btn btn--sun btn--sm" type="button" data-request="${esc(r.id)}" aria-label="Request a seat to ${esc(r.to)} on ${esc(dayLabel(d))}">Request seat</button>`;
    return `
      <li class="ride${r.isNew ? " is-new" : ""}" id="ride-${esc(r.id)}">
        <div class="ride__top">
          <span class="tag tag--${esc(r.type)}">${icon(r.type)}${esc(TYPE_LABEL[r.type])}</span>
          <p class="ride__when"><span class="ride__day">${esc(dayLabel(d))}</span><span class="ride__time">${esc(timeFmt.format(d))}</span></p>
        </div>
        <div class="ride__body">
          <div class="route">
            <span class="route__line" aria-hidden="true"><span></span></span>
            <p class="route__stop">${esc(r.from)}<small>Pickup: ${esc(r.pickup)}</small></p>
            <p class="route__stop">${esc(r.to)}${r.dropoff ? `<small>Drop-off: ${esc(r.dropoff)}</small>` : ""}</p>
          </div>
          <div class="ride__meta">
            <div class="driver">
              <span class="avatar" aria-hidden="true">${esc(r.driver.trim().charAt(0).toUpperCase())}</span>
              <div><p class="driver__name">${esc(r.driver)}</p><p class="driver__sub">Driver · Class of ${esc(r.year)}</p></div>
            </div>
            <div>
              <div class="seats" aria-hidden="true">${seatIcons}</div>
              <p class="ride__seats-label">${open} of ${r.seats} open</p>
            </div>
          </div>
        </div>
        <div class="ride__foot">
          <p class="price">$${esc(r.price)}<small>/ seat</small></p>
          ${action}
        </div>
      </li>`;
  }

  function render() {
    const list = visibleRides();
    ridesEl.innerHTML = list.map(rideCard).join("");
    emptyEl.hidden = list.length > 0;
    const seats = list.reduce((n, r) => n + Math.max(0, r.seats - r.taken), 0);
    countEl.textContent = list.length
      ? `${list.length} ${list.length === 1 ? "ride" : "rides"} · ${seats} open ${seats === 1 ? "seat" : "seats"}`
      : "";
    state.rides.forEach((r) => delete r.isNew);
  }

  function setTypeFilter(type) {
    filters.type = type;
    $$(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === type)));
    render();
  }
  $$(".chip").forEach((c) => c.addEventListener("click", () => setTypeFilter(c.dataset.filter)));
  let searchTimer;
  $("#ride-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { filters.q = e.target.value; render(); }, 150);
  });
  $("#ride-when").addEventListener("change", (e) => { filters.when = e.target.value; render(); });
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-filter-link]");
    if (link) setTypeFilter(link.dataset.filterLink);
  });
  $("[data-reset-demo]").addEventListener("click", () => {
    RideStore.clear();
    state = { rides: seedRides(), requests: {} };
    RideStore.save(state);
    render();
    toast("Demo board reset.");
  });

  /* ---------- dialogs ---------- */
  const offerDlg = $("#offer-dialog");
  const reqDlg = $("#request-dialog");
  let lastTrigger = null;
  function openDialog(dlg, trigger) {
    lastTrigger = trigger || document.activeElement;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    const first = $("input:not([type=hidden]):not([value]), input, textarea", dlg);
    if (first) first.focus();
  }
  function closeDialog(dlg) {
    if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
  }
  [offerDlg, reqDlg].forEach((dlg) => {
    dlg.addEventListener("close", () => { if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus(); });
    $$("[data-close-dialog]", dlg).forEach((b) => b.addEventListener("click", () => closeDialog(dlg)));
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDialog(dlg); }); // backdrop
  });

  /* ---------- request a seat ---------- */
  let requestingId = null;
  ridesEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-request]");
    if (!btn) return;
    const r = state.rides.find((x) => x.id === btn.dataset.request);
    if (!r) return;
    requestingId = r.id;
    const d = new Date(r.when);
    $(".request__summary", reqDlg).innerHTML =
      `<strong>${esc(r.from)} → ${esc(r.to)}</strong>
       <span>${esc(dayLabel(d))} at ${esc(timeFmt.format(d))} · Pickup: ${esc(r.pickup)}</span>
       <span>Driver: ${esc(r.driver)} · Chip-in: <b>$${esc(r.price)}</b> per seat</span>`;
    $("#request-form").reset();
    clearErrors($("#request-form"));
    openDialog(reqDlg, btn);
  });

  $("#request-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = $("#r-name");
    clearErrors(form);
    if (!name.value.trim()) {
      setError(name, "Enter your name so the driver knows who's riding.");
      name.focus();
      return;
    }
    const r = state.rides.find((x) => x.id === requestingId);
    if (r && r.taken < r.seats) {
      r.taken += 1;
      state.requests[r.id] = { name: name.value.trim(), note: $("#r-note").value.trim(), at: new Date().toISOString() };
      RideStore.save(state);
      lastTrigger = null;
      closeDialog(reqDlg);
      render();
      const card = $("#ride-" + CSS.escape(r.id) + " .btn");
      if (card) card.focus();
      toast(`Demo: seat requested. In the live app, ${r.driver} would confirm your ride to ${r.to}.`);
    }
  });

  /* ---------- offer a ride ---------- */
  const offerForm = $("#offer-form");
  $$("[data-open-offer]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      offerForm.reset();
      clearErrors(offerForm);
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      $("#o-date").min = toDateInput(new Date());
      $("#o-date").value = toDateInput(tomorrow);
      $(".calc__out").innerHTML = `Our guide: about $${CHIP_IN.perHour} per hour of driving.`;
      openDialog(offerDlg, b);
    })
  );
  function toDateInput(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // seat stepper
  const seatsInput = $("#o-seats");
  $$("[data-step]", offerDlg).forEach((b) =>
    b.addEventListener("click", () => {
      const v = Math.min(7, Math.max(1, (Number(seatsInput.value) || 1) + Number(b.dataset.step)));
      seatsInput.value = v;
    })
  );

  // gas calculator
  $("[data-calc]").addEventListener("click", () => {
    const mins = Number($("#o-mins").value);
    const out = $(".calc__out");
    if (!mins || mins <= 0) {
      out.innerHTML = "Enter the one-way drive time in minutes first.";
      $("#o-mins").focus();
      return;
    }
    const per = suggestChipIn(mins);
    $("#o-price").value = per;
    out.innerHTML = `A ${mins}-minute drive → <strong>$${per}/seat</strong> (filled in).`;
  });

  // validation
  function setError(input, msg) {
    const id = (input.id || input.name) + "-err";
    const errEl = document.getElementById(id) || document.getElementById("o-type-err");
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), errEl.id].filter(Boolean).join(" "));
    errEl.textContent = msg;
  }
  function clearErrors(form) {
    $$("[aria-invalid]", form).forEach((el) => {
      el.removeAttribute("aria-invalid");
      const ids = (el.getAttribute("aria-describedby") || "").split(" ").filter((x) => x && !x.endsWith("-err"));
      ids.length ? el.setAttribute("aria-describedby", ids.join(" ")) : el.removeAttribute("aria-describedby");
    });
    $$(".field__error", form).forEach((el) => (el.textContent = ""));
    const sum = $(".error-summary", form);
    if (sum) sum.hidden = true;
  }
  function validateOffer() {
    const errors = [];
    const req = (id, msg) => { const el = $("#" + id); if (!el.value.trim()) errors.push([el, msg]); };
    req("o-name", "Enter your name.");
    if (!offerForm.querySelector('input[name="type"]:checked')) errors.push([offerForm.querySelector('input[name="type"]'), "Choose a trip type."]);
    req("o-from", "Enter where you're leaving from.");
    req("o-to", "Enter where you're headed.");
    req("o-pickup", "Enter a pickup spot riders can find.");
    req("o-date", "Choose a date.");
    req("o-time", "Choose a departure time.");
    const price = $("#o-price");
    if (price.value === "" || Number(price.value) < 0 || Number(price.value) > 100)
      errors.push([price, "Enter a chip-in between $0 and $100. Use “Suggest” if you're unsure."]);
    const date = $("#o-date"), time = $("#o-time");
    if (date.value && time.value && new Date(`${date.value}T${time.value}`) < new Date())
      errors.push([time, "That departure time has already passed."]);
    return errors;
  }
  // validate a single field on blur, once touched
  $$("input, select", offerForm).forEach((el) =>
    el.addEventListener("blur", () => {
      if (!el.hasAttribute("aria-invalid")) return;
      const stillBad = validateOffer().some(([f]) => f === el);
      if (!stillBad) {
        el.removeAttribute("aria-invalid");
        const err = document.getElementById(el.id + "-err");
        if (err) err.textContent = "";
      }
    })
  );

  offerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors(offerForm);
    const errors = validateOffer();
    if (errors.length) {
      errors.forEach(([el, msg]) => setError(el, msg));
      const sum = $(".error-summary", offerForm);
      $("ul", sum).innerHTML = errors.map(([el, msg]) => `<li><a href="#${el.id}">${esc(msg)}</a></li>`).join("");
      sum.hidden = false;
      sum.focus();
      $$("a", sum).forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); $(a.getAttribute("href")).focus(); }));
      return;
    }
    const fd = new FormData(offerForm);
    const ride = {
      id: "u" + Date.now().toString(36),
      type: fd.get("type"),
      from: fd.get("from").trim(),
      to: fd.get("to").trim(),
      pickup: fd.get("pickup").trim(),
      dropoff: (fd.get("dropoff") || "").trim(),
      when: new Date(`${fd.get("date")}T${fd.get("time")}`).toISOString(),
      seats: Math.min(7, Math.max(1, Number(fd.get("seats")) || 1)),
      taken: 0,
      price: Math.round(Number(fd.get("price"))),
      driver: fd.get("name").trim(),
      year: fd.get("year"),
      isNew: true,
    };
    state.rides.push(ride);
    RideStore.save({ ...state, rides: state.rides.map(({ isNew, ...r }) => r) });
    lastTrigger = null;
    closeDialog(offerDlg);
    // make sure the new ride is visible
    filters.type = "all"; filters.q = ""; filters.when = "any";
    $("#ride-search").value = ""; $("#ride-when").value = "any";
    setTypeFilter("all");
    const card = $("#ride-" + CSS.escape(ride.id));
    if (card) {
      card.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
      card.setAttribute("tabindex", "-1");
      card.focus({ preventScroll: true });
    }
    toast(`Demo ride to ${ride.to} added. Only you can see it, in this browser.`);
  });

  render();

  /* ---------- scroll reveals ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    reveals.forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 60}ms`; io.observe(el); });
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }
})();

/* ---------- Get updates: email sign-up → Google Form ----------
   To connect: in your Google Form click ⋮ → "Get pre-filled link",
   fill both answers, copy the link, and copy its pieces in here:
     action     → https://docs.google.com/forms/d/e/<FORM ID>/formResponse
     emailField → the entry.123456789 name used for the email answer
     roleField  → the entry.987654321 name used for the ride/drive answer
   The ride/drive question's choices must be exactly: Ride, Drive, Both. */
(() => {
  "use strict";
  const WAITLIST_FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSe82ewhXSWMIfGiJntPu82RA5ykrnMdh6Sjrgp1qLe7R1vO3w/formResponse",
    emailField: "entry.1739501062",
    roleField: "entry.1649000673",
  };

  const form = document.getElementById("updates-form");
  if (!form) return;
  const email = form.querySelector("#u-email");
  const err = form.querySelector("#u-email-err");
  const status = form.querySelector(".updates__status");
  const fields = form.querySelector(".updates__fields");
  const done = form.querySelector(".updates__done");
  const submit = form.querySelector(".updates__submit");
  const JOINED_KEY = "greenlight-updates-joined";
  const isConfigured = () => /^https:\/\/docs\.google\.com\/forms\/.+\/formResponse$/.test(WAITLIST_FORM.action) && WAITLIST_FORM.emailField;

  const showDone = (focus) => {
    fields.hidden = true;
    done.hidden = false;
    status.textContent = "";
    if (focus) done.focus();
  };
  try { if (localStorage.getItem(JOINED_KEY)) showDone(false); } catch (_) { /* storage unavailable */ }

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  function setError(msg) {
    err.textContent = msg;
    msg ? email.setAttribute("aria-invalid", "true") : email.removeAttribute("aria-invalid");
  }
  email.addEventListener("blur", () => {
    if (email.hasAttribute("aria-invalid") && validEmail(email.value.trim())) setError("");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    const value = email.value.trim();
    if (!validEmail(value)) {
      setError(value ? "That email doesn't look right. Check for typos, like a missing @." : "Enter your email to get updates.");
      email.focus();
      return;
    }
    setError("");
    if (form.querySelector("#u-website").value) { showDone(true); return; } // bot

    if (!isConfigured()) {
      status.textContent = "Sign-ups aren't connected yet. Please check back soon!";
      return;
    }

    const body = new URLSearchParams();
    body.append(WAITLIST_FORM.emailField, value);
    const role = form.querySelector('input[name="role"]:checked');
    if (role && WAITLIST_FORM.roleField) body.append(WAITLIST_FORM.roleField, role.value);

    submit.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submit.textContent = "Sending…";
    try {
      // Google Forms doesn't allow reading the response cross-site; a
      // completed request means Google received it.
      await fetch(WAITLIST_FORM.action, { method: "POST", mode: "no-cors", body });
      try { localStorage.setItem(JOINED_KEY, "1"); } catch (_) { /* ignore */ }
      showDone(true);
    } catch (_) {
      status.textContent = "We couldn't send that. Check your connection and try again.";
    } finally {
      submit.removeAttribute("aria-busy");
      submit.disabled = false;
      submit.textContent = "Keep me posted";
    }
  });
})();
