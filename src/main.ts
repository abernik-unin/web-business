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
