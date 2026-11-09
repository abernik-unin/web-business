import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const html = readFileSync(resolve(root, "index.html"), "utf8");
const main = readFileSync(resolve(root, "src/main.ts"), "utf8");
const inquiry = readFileSync(resolve(root, "src/inquiry.ts"), "utf8");
const css = readFileSync(resolve(root, "src/style.css"), "utf8");
const publicText = `${html}\n${css}`;
const visibleHtml = html.replace(/<svg[\s\S]*?<\/svg>/g, "");

describe("javni sadržaj", () => {
  it("je na hrvatskom i pokriva dogovorene usluge", () => {
    expect(html).toContain('lang="hr"');
    for (const phrase of [
      "3D vizualizacija",
      "3D modeliranje",
      "3D skeniranje",
      "Fotogrametrija i LiDAR",
      "Konzulting",
      "Izrada web stranica",
      "Optimiziranje procesa",
      "malih i srednjih",
      "poslovnim subjektima",
    ]) {
      expect(html).toContain(phrase);
    }
  });

  it("ima odredišta navigacije i iskren kontakt bez lažnih podataka", () => {
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('data-connected="false"');
    expect(html).toContain("Radna inačica");
    expect(html).toContain("Još nije unesena");
    expect(html).toContain("Još nije unesen");
    expect(html).toContain("nije povezan");
    expect(html).toContain("<noscript>");
    expect(html).toMatch(/<button[^>]*id="posalji"[^>]*disabled/);
    for (const id of ["usluge", "nacin-rada", "proces", "radovi", "kontakt"]) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith("#") || href.startsWith("/")).toBe(true);
      expect(href).not.toBe("#");
      if (!href.startsWith("#")) continue;
      const id = href.slice(1);
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("ne izmišlja kontakt, reference, brojke ni vanjske poveznice", () => {
    const banned = [
      /mailto:/i,
      /tel:/i,
      /href="https?:/i,
      /@/,
      /lorem/i,
      /ipsum/i,
      /najbolj/i,
      /garanci/i,
      /jamči/i,
      /jamci/i,
      /certifik/i,
      /testimonial/i,
      /recenzij/i,
      /godine iskustva/i,
      /zadovoljn/i,
      /\+385/,
      /\bOIB\b/,
      /d\.o\.o/i,
      /j\.d\.o\.o/i,
      /uspješno poslan/i,
    ];
    for (const pattern of banned) {
      const target = pattern.source === "@" ? visibleHtml : publicText;
      expect(target).not.toMatch(pattern);
    }
    expect(visibleHtml).not.toMatch(/\+?\d[\d\s()/.-]{8,}/);
  });
});

describe("ponašanje obrasca u kodu", () => {
  it("samo sprječava slanje i ne dira mrežu ni pohranu", () => {
    expect(main).toContain("preventDefault");
    expect(main).toContain("reviewInquiry");
    expect(inquiry).toContain("sent: false");
    expect(inquiry).toContain("stored: false");
    const sources = `${main}\n${inquiry}`;
    for (const token of ["fetch(", "localStorage", "sendBeacon", "XMLHttpRequest", "innerHTML", "console.log"]) {
      expect(sources).not.toContain(token);
    }
    expect(sources.toLowerCase()).not.toContain("uspješno");
  });
});
