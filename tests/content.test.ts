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
  it("je na hrvatskom i pokriva samo dizajn", () => {
    expect(html).toContain('lang="hr"');
    for (const phrase of ["2D dizajn", "3D vizualizacija", "3D modeliranje", "Projekti", "Kontakt", "poslovne subjekte"]) {
      expect(html).toContain(phrase);
    }
    for (const gone of ["3D skeniranje", "Fotogrametrija", "LiDAR", "Konzulting", "Izrada web stranica", "Optimiziranje procesa", "Način rada"]) {
      expect(html).not.toContain(gone);
    }
  });

  it("ima odredišta navigacije i iskren kontakt bez lažnih podataka", () => {
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('data-connected="false"');
    expect(html).toContain("Radna inačica");
    expect(html).toContain("mailto:kontakt@3dfx.hr");
    expect(html).toContain("Još nije unesen");
    expect(html).toContain("47376800432");
    expect(html).toContain("HR0423900013223608559");
    expect(html).toContain('data-kod="ukljucen"');
    expect(html).toContain('id="prikazi-kod"');
    expect(html).toContain("Skenirajte u aplikaciji svoje banke");
    expect(main).toContain("placanje-kod.png");
    expect(html).toContain("nije povezan");
    expect(html).toContain("<noscript>");
    expect(html).toMatch(/<button[^>]*id="posalji"[^>]*disabled/);
    for (const id of ["projekti", "dizajn", "kontakt"]) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`href="#${id}"`);
    }

    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      if (href === "mailto:kontakt@3dfx.hr") continue;
      expect(href?.startsWith("#") || href?.startsWith("/")).toBe(true);
      expect(href).not.toBe("#");
      if (!href?.startsWith("#")) continue;
      const id = href.slice(1);
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("ne izmišlja kontakt, reference, brojke ni vanjske poveznice", () => {
    const banned = [
      /mailto:(?!kontakt@3dfx\.hr)/i,
      /tel:/i,
      /href="https?:/i,
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
      /d\.o\.o/i,
      /j\.d\.o\.o/i,
      /uspješno poslan/i,
    ];
    for (const pattern of banned) {
      expect(publicText).not.toMatch(pattern);
    }
    const withoutGiven = visibleHtml
      .replaceAll("kontakt@3dfx.hr", "")
      .replaceAll("47376800432", "")
      .replaceAll("HR0423900013223608559", "");
    expect(withoutGiven).not.toMatch(/@/);
    expect(withoutGiven).not.toMatch(/\+?\d[\d\s()/.-]{8,}/);
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
    expect(main).not.toContain("three");
    expect(readFileSync(resolve(root, "package.json"), "utf8")).not.toContain("three");
  });
});
