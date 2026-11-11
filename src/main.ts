import "@fontsource-variable/nunito/wght.css";
import "@fontsource-variable/outfit/wght.css";
import "./style.css";
import { reviewInquiry, type InquiryInput } from "./inquiry";

const toggle = document.querySelector("#otvori-izbornik");
const nav = document.querySelector("#izbornik");
const main = document.querySelector("main");
const footer = document.querySelector("footer");

function setMenu(open: boolean): void {
  if (!(toggle instanceof HTMLButtonElement) || !(nav instanceof HTMLElement)) return;
  nav.dataset.open = open ? "true" : "false";
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.textContent = open ? "Zatvori" : "Izbornik";
  document.body.classList.toggle("nav-open", open);
  if (open) {
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");
  } else {
    main?.removeAttribute("inert");
    footer?.removeAttribute("inert");
  }
}

if (toggle instanceof HTMLButtonElement && nav instanceof HTMLElement) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setMenu(open);
    if (open) {
      const first = nav.querySelector("a");
      if (first instanceof HTMLAnchorElement) first.focus();
    }
  });

  nav.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLAnchorElement)) return;
    // Inert bi inače zaustavio skok, a trenutno skrivanje izbornika prekida klik.
    main?.removeAttribute("inert");
    footer?.removeAttribute("inert");
    window.setTimeout(() => setMenu(false), 0);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;
    setMenu(false);
    toggle.focus();
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    if (toggle.getAttribute("aria-expanded") === "true") setMenu(false);
  });

  const desktop = window.matchMedia("(min-width: 861px)");
  desktop.addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });
}

const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('#izbornik a[href^="#"]')];
const observed = navLinks.flatMap((link) => {
  const id = link.getAttribute("href")?.slice(1);
  const section = id ? document.getElementById(id) : null;
  return section ? [{ link, section }] : [];
});

if (observed.length > 0) {
  const updateCurrent = (): void => {
    let current: (typeof observed)[number] | undefined;
    for (const item of observed) {
      if (item.section.getBoundingClientRect().top <= 140) current = item;
    }
    for (const item of observed) {
      if (item === current) item.link.setAttribute("aria-current", "true");
      else item.link.removeAttribute("aria-current");
    }
  };
  updateCurrent();
  window.addEventListener("scroll", updateCurrent, { passive: true });
  window.addEventListener("hashchange", updateCurrent);
}

const form = document.querySelector("#upit");
const status = document.querySelector("#upit-status");
const submitButton = document.querySelector("#posalji");

function fieldOf(scope: HTMLFormElement, name: string): HTMLInputElement | HTMLTextAreaElement | null {
  const element = scope.elements.namedItem(name);
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) return element;
  return null;
}

function showFieldError(
  scope: HTMLFormElement,
  name: "name" | "email" | "message",
  message: string | undefined,
): void {
  const field = fieldOf(scope, name);
  const error = scope.querySelector(`#pogreska-${name}`);
  if (error) error.textContent = message ?? "";
  if (!field) return;
  const hintId = field.dataset.hint;
  if (message) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", hintId ? `${hintId} pogreska-${name}` : `pogreska-${name}`);
  } else {
    field.removeAttribute("aria-invalid");
    if (hintId) field.setAttribute("aria-describedby", hintId);
    else field.removeAttribute("aria-describedby");
  }
}

if (form instanceof HTMLFormElement && status instanceof HTMLElement && submitButton instanceof HTMLButtonElement) {
  const onSubmit = (event: Event): void => {
    event.preventDefault();
    const data = new FormData(form);
    const input: InquiryInput = {
      name: String(data.get("name") ?? ""),
      company: String(data.get("company") ?? ""),
      email: String(data.get("email") ?? ""),
      interest: String(data.get("interest") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    try {
      const result = reviewInquiry(input);
      showFieldError(form, "name", result.fieldErrors.name);
      showFieldError(form, "email", result.fieldErrors.email);
      showFieldError(form, "message", result.fieldErrors.message);
      status.hidden = false;
      status.textContent = result.status;
      const firstInvalid = form.querySelector<HTMLElement>("[aria-invalid='true']");
      if (firstInvalid) firstInvalid.focus();
      else status.focus();
    } catch {
      status.hidden = false;
      status.textContent =
        "Poruka nije poslana. Provjera obrasca nije dovršena, a podaci nisu proslijeđeni.";
      status.focus();
    }
  };

  form.addEventListener("submit", onSubmit);
  submitButton.disabled = false;
}

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktopMouse = finePointer || navigator.maxTouchPoints === 0;

if (desktopMouse && !reducedMotion) {
  const orbs = [...document.querySelectorAll<HTMLElement>(".orb")];
  const drift = orbs.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
  const maxPush = 28;
  let frame = 0;

  const tick = (): void => {
    let moving = false;
    orbs.forEach((orb, index) => {
      const item = drift[index];
      if (!item) return;
      item.vx = (item.vx + (item.tx - item.x) * 0.08) * 0.72;
      item.vy = (item.vy + (item.ty - item.y) * 0.08) * 0.72;
      item.x = Math.max(-maxPush, Math.min(maxPush, item.x + item.vx));
      item.y = Math.max(-maxPush, Math.min(maxPush, item.y + item.vy));
      if (Math.hypot(item.vx, item.vy) > 0.05 || Math.hypot(item.tx, item.ty) > 0.05) moving = true;
      orb.style.transform = `translate3d(${item.x.toFixed(2)}px, ${item.y.toFixed(2)}px, 0)`;
    });
    frame = moving ? window.requestAnimationFrame(tick) : 0;
  };

  const place = (clientX: number, clientY: number): void => {
    orbs.forEach((orb, index) => {
      const item = drift[index];
      if (!item) return;
      const rect = orb.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 - item.x;
      const cy = rect.top + rect.height / 2 - item.y;
      const dx = cx - clientX;
      const dy = cy - clientY;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = Math.max(96, rect.width * 0.55);
      const influence = Math.max(0, 1 - distance / reach);
      item.tx = (dx / distance) * influence * maxPush;
      item.ty = (dy / distance) * influence * maxPush;
    });
    if (!frame) frame = window.requestAnimationFrame(tick);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "mouse") return;
      place(event.clientX, event.clientY);
    },
    { passive: true },
  );

  document.documentElement.addEventListener("pointerleave", () => {
    for (const item of drift) {
      item.tx = 0;
      item.ty = 0;
    }
    if (!frame) frame = window.requestAnimationFrame(tick);
  });
}

const legalButton = document.querySelector("#pravni-podaci");
const legalPanel = document.querySelector("#pravni-panel");
if (legalButton instanceof HTMLButtonElement && legalPanel instanceof HTMLElement) {
  const setLegal = (open: boolean): void => {
    legalButton.setAttribute("aria-expanded", open ? "true" : "false");
    legalPanel.classList.toggle("je-otvoren", open);
    legalPanel.setAttribute("aria-hidden", open ? "false" : "true");
    legalPanel.toggleAttribute("inert", !open);
  };
  setLegal(false);
  legalButton.addEventListener("click", () => {
    setLegal(legalButton.getAttribute("aria-expanded") !== "true");
  });
}

const codeButton = document.querySelector("#prikazi-kod");
const codeDialog = document.querySelector("#kod-prozor");
const codeImage = document.querySelector("#kod-slika");
const codeClose = document.querySelector("#kod-zatvori");
const closeCode = (): void => {
  if (!(codeDialog instanceof HTMLElement) || !(codeButton instanceof HTMLButtonElement)) return;
  codeDialog.hidden = true;
  codeButton.focus();
};

if (
  codeButton instanceof HTMLButtonElement &&
  codeButton.dataset.kod === "ukljucen" &&
  codeDialog instanceof HTMLElement &&
  codeImage instanceof HTMLImageElement &&
  codeClose instanceof HTMLButtonElement
) {
  const probe = new Image();
  probe.onload = () => {
    if (probe.naturalWidth < 1) return;
    codeImage.src = probe.src;
    codeButton.hidden = false;
  };
  probe.src = `${import.meta.env.BASE_URL}placanje-kod.png`;

  codeButton.addEventListener("click", () => {
    codeDialog.hidden = false;
    codeClose.focus();
  });
  codeClose.addEventListener("click", closeCode);
  codeDialog.addEventListener("click", (event) => {
    if (event.target === codeDialog) closeCode();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !codeDialog.hidden) closeCode();
  });
}
