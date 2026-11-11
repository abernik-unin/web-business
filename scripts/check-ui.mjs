import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import puppeteer from "puppeteer-core";

const port = 4173;
const base = `http://127.0.0.1:${port}/`;
const artifacts = "/opt/cursor/artifacts";
const shots = process.env.SHOTS !== "0";
const chrome = "/usr/local/bin/google-chrome";

const server = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: ["ignore", "pipe", "pipe"] },
);

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Poslužitelj još nije spreman.
    }
    await delay(200);
  }
  throw new Error(`Pregled nije krenuo.\n${serverLog}`);
}

async function prepare(page) {
  const pageErrors = [];
  const badResponses = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(base, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  return { pageErrors, badResponses };
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
  ],
});

try {
  await waitForServer();
  await mkdir(artifacts, { recursive: true });
  const page = await browser.newPage();

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const desktopWatch = await prepare(page);
  check((await page.$eval("h1", (node) => node.textContent?.trim()))?.includes("2D i 3D"), "Nedostaje naslov");
  check((await page.$eval("html", (node) => node.lang)) === "hr", "Jezik nije hr");
  check((await page.$$("h1")).length === 1, "Nije točno jedan h1");
  const enabled = await page.$eval("#posalji", (node) => node.disabled === false);
  check(enabled, "Gumb za upit ostao je isključen");

  const broken = await page.evaluate(() =>
    [...document.images]
      .filter((image) => {
      if (image.id === "kod-slika") return false;
      return image.getAttribute("src") && (!image.complete || image.naturalWidth === 0);
    })
      .map((image) => image.src),
  );
  check(broken.length === 0, `Slike se ne učitavaju: ${broken.join(", ")}`);

  const links = await page.$$eval("#izbornik a", (nodes) => nodes.map((node) => node.getAttribute("href")));
  for (const href of links) {
    check(Boolean(href?.startsWith("#")), `Loša poveznica ${href}`);
    await page.click(`#izbornik a[href="${href}"]`);
    const id = href?.slice(1);
    await page.waitForFunction(
      (targetId) => {
        const target = document.getElementById(targetId);
        if (!target) return false;
        const top = target.getBoundingClientRect().top;
        return top > 20 && top < 180;
      },
      { timeout: 4000 },
      id,
    );
  }

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await delay(50);
    const extra = await overflow(page);
    check(extra <= 1, `Vodoravni preljev na ${width}px: ${extra}px`);
  }

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
  const heroLayout = await page.evaluate(() => {
    const header = document.querySelector(".site-header")?.getBoundingClientRect();
    const card = document.querySelector(".hero .staklo")?.getBoundingClientRect();
    const projekti = document.querySelector("#projekti")?.getBoundingClientRect();
    const footer = document.querySelector(".site-footer")?.getBoundingClientRect();
    const box = document.querySelector(".podnozje")?.getBoundingClientRect();
    return {
      belowHeader: header && card ? Math.round(card.top - header.bottom) : -1,
      beforeProjekti: card && projekti ? Math.round(projekti.top - card.bottom) : -1,
      cardWidth: card ? Math.round(card.width) : -1,
      footerGap: footer && box ? Math.round(box.top - footer.top) : -1,
    };
  });
  check(Math.abs(heroLayout.belowHeader - 38) <= 2, `Hero nije 38 px ispod zaglavlja: ${heroLayout.belowHeader}`);
  check(Math.abs(heroLayout.beforeProjekti - 113) <= 2, `Projekti nisu 113 px ispod kartice: ${heroLayout.beforeProjekti}`);
  check(Math.abs(heroLayout.cardWidth - (40 * 16 + 151)) <= 2, `Širina kartice: ${heroLayout.cardWidth}`);
  check(Math.abs(heroLayout.footerGap - 39) <= 2, `Podnožje nije odmaknuto od crte: ${heroLayout.footerGap}`);
  if (shots) await page.screenshot({ path: `${artifacts}/hero_razmak_desktop.png` });

  const requests = [];
  const onRequest = (request) => requests.push(request.url());
  page.on("request", onRequest);
  await page.click("#posalji");
  await page.waitForSelector("#upit-status:not([hidden])");
  const emptyStatus = await page.$eval("#upit-status", (node) => node.textContent ?? "");
  check(emptyStatus.includes("nije poslana"), `Prazan upit nema ispravnu poruku: ${emptyStatus}`);
  check(!/uspješno|hvala/i.test(emptyStatus), `Prazan upit zvuči kao uspjeh: ${emptyStatus}`);
  const invalidName = await page.$eval("#ime", (node) => node.getAttribute("aria-invalid"));
  check(invalidName === "true", "Prazno ime nije označeno");

  await page.$eval("#ime", (node) => {
    node.value = "Ana Anić";
  });
  await page.$eval("#tvrtka", (node) => {
    node.value = "Primjer obrt";
  });
  await page.$eval("#eposta", (node) => {
    node.value = "ana@primjer.hr";
  });
  await page.select("#interes", "3D vizualizacija");
  await page.$eval("#poruka", (node) => {
    node.value = "Trebamo model malog izložbenog pulta za interni dogovor.";
  });
  const before = requests.length;
  await page.click("#posalji");
  await page.waitForFunction(
    () => document.querySelector("#upit-status")?.textContent?.includes("nije povezan"),
    { timeout: 3000 },
  );
  const sentStatus = await page.$eval("#upit-status", (node) => node.textContent ?? "");
  check(sentStatus.includes("nije proslijeđen"), `Potpun upit nema jasnu odbijenicu: ${sentStatus}`);
  check(!/uspješno|hvala|proslijeđen je|spremljen je/i.test(sentStatus), `Potpun upit zvuči kao uspjeh: ${sentStatus}`);
  const leaked = requests.slice(before).filter((url) => !url.startsWith("data:"));
  check(leaked.length === 0, `Upit je izazvao zahtjeve: ${leaked.join(", ")}`);
  page.off("request", onRequest);

  const formShot = await page.$("#upit");
  check(Boolean(formShot), "Obrazac nije pronađen za snimku");
  if (shots && formShot) await formShot.screenshot({ path: `${artifacts}/kontakt_nije_poslano.png` });

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await prepare(page);
  const closed = await page.$eval("#izbornik", (node) => getComputedStyle(node).display === "none");
  check(closed, "Mobilni izbornik je vidljiv prije otvaranja");
  if (shots) await page.screenshot({ path: `${artifacts}/puls_izbornik_mobilna.png` });
  await page.click("#otvori-izbornik");
  const opened = await page.$eval("#otvori-izbornik", (node) => node.getAttribute("aria-expanded") === "true");
  check(opened, "Izbornik se nije otvorio");
  const menuVisible = await page.$eval("#izbornik", (node) => getComputedStyle(node).display !== "none");
  check(menuVisible, "Stavke izbornika nisu vidljive");
  if (shots) await page.screenshot({ path: `${artifacts}/izbornik_mobilni.png` });
  await page.keyboard.press("Escape");
  const escaped = await page.evaluate(() => ({
    expanded: document.querySelector("#otvori-izbornik")?.getAttribute("aria-expanded"),
    focus: document.activeElement?.id,
  }));
  check(escaped.expanded === "false" && escaped.focus === "otvori-izbornik", `Escape nije vratio izbornik: ${JSON.stringify(escaped)}`);
  await page.click("#otvori-izbornik");
  await page.click('#izbornik a[href="#kontakt"]');
  await page.waitForFunction(
    () => {
      const menu = document.querySelector("#izbornik");
      const target = document.getElementById("kontakt");
      const display = menu ? getComputedStyle(menu).display : "";
      const top = target ? target.getBoundingClientRect().top : -1;
      return display === "none" && top > 20 && top < 200;
    },
    { timeout: 4000 },
  );
  const mobileOverflow = await overflow(page);
  check(mobileOverflow <= 1, `Mobilni preljev nakon izbornika: ${mobileOverflow}px`);

  if (shots) {
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await prepare(page);
    for (const [name, id] of [
      ["projekti", "projekti"],
      ["dizajn", "dizajn"],
      ["kontakt", "kontakt"],
    ]) {
      await page.click(`#izbornik a[href="#${id}"]`);
      await delay(400);
      await page.screenshot({ path: `${artifacts}/staklo_${name}_desktop.png` });
    }
  }

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await prepare(page);
  const pulse = await page.$eval(".sjaj", (node) => {
    const style = getComputedStyle(node);
    return { duration: style.animationDuration, timing: style.animationTimingFunction };
  });
  check(pulse.duration === "10s" && pulse.timing === "linear", `Puls nije jednoličan: ${JSON.stringify(pulse)}`);
  const orbCenter = await page.$eval(".orb-a", (node) => {
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(orbCenter.x - 36, orbCenter.y);
  await delay(450);
  const pushed = await page.$eval(".orb-a", (node) => node.style.transform);
  check(/translate3d\((?:[1-9]|[1-9]\d)/.test(pushed), `Orb se nije odmaknuo: ${pushed}`);
  await page.mouse.move(6, 6, { steps: 12 });
  await delay(800);
  const returned = await page.$eval(".orb-a", (node) => node.style.transform);
  const offsets = [...returned.matchAll(/-?\d+(?:\.\d+)?px/g)].map((match) => Math.abs(parseFloat(match[0])));
  check(offsets.length > 0 && offsets.every((value) => value < 2.5), `Orb se nije vratio: ${returned}`);

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector(".site-footer")?.scrollIntoView({ block: "end" });
  });
  await page.waitForFunction(() => document.querySelector("#prikazi-kod")?.hidden === false, { timeout: 5000 });
  if (shots) await page.screenshot({ path: `${artifacts}/podnozje_zatvoreno.png` });
  await page.click("#pravni-podaci");
  await delay(350);
  const legalOpen = await page.$eval("#pravni-podaci", (node) => node.getAttribute("aria-expanded"));
  check(legalOpen === "true", "Pravni podaci se nisu otvorili");
  if (shots) await page.screenshot({ path: `${artifacts}/podnozje_otvoreno.png` });
  await page.click("#prikazi-kod");
  await page.waitForSelector("#kod-prozor:not([hidden])");
  const caption = await page.$eval("#kod-naslov", (node) => node.textContent?.trim());
  check(caption === "Skenirajte u aplikaciji svoje banke", `Natpis koda: ${caption}`);
  const crisp = await page.$eval("#kod-slika", (node) => ({
    rendering: getComputedStyle(node).imageRendering,
    width: node.naturalWidth,
    complete: node.complete,
  }));
  check(crisp.complete && crisp.width === 421 && (crisp.rendering === "pixelated" || crisp.rendering === "crisp-edges"), `Barkod nije oštar: ${JSON.stringify(crisp)}`);
  if (shots) await page.screenshot({ path: `${artifacts}/kod_placanje_otvoren.png` });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    const footer = document.querySelector(".site-footer");
    const header = document.querySelector(".site-header");
    footer?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -((header?.getBoundingClientRect().height ?? 0) + 12));
  });
  await delay(200);
  if (shots) await page.screenshot({ path: `${artifacts}/podnozje_otvoreno_mobilna.png` });

  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(base, { waitUntil: "networkidle0" });
  const still = await page.$eval(".sjaj", (node) => getComputedStyle(node).animationName);
  check(still === "none", `Oblik se i dalje miče: ${still}`);
  const menuLabel = await page.$eval("#otvori-izbornik", (node) => {
    const button = node;
    const style = getComputedStyle(button);
    const box = button.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(button);
    const text = range.getBoundingClientRect();
    return {
      display: style.display,
      align: style.alignItems,
      justify: style.justifyContent,
      dx: Math.abs(text.left + text.width / 2 - (box.left + box.width / 2)),
      dy: Math.abs(text.top + text.height / 2 - (box.top + box.height / 2)),
    };
  });
  check(
    (menuLabel.display === "inline-flex" || menuLabel.display === "flex") && menuLabel.align === "center" && menuLabel.justify === "center",
    `Gumb izbornika nije centriran: ${JSON.stringify(menuLabel)}`,
  );
  check(menuLabel.dx < 2 && menuLabel.dy < 2, `Tekst izbornika nije u sredini: ${JSON.stringify(menuLabel)}`);

  check(desktopWatch.pageErrors.length === 0, `Greške stranice: ${desktopWatch.pageErrors.join(" | ")}`);
  check(desktopWatch.badResponses.length === 0, `Loši odgovori: ${desktopWatch.badResponses.join(" | ")}`);

  if (failures.length > 0) {
    console.error(failures.map((item) => `- ${item}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("UI provjera je prošla: poveznice, preljev, izbornik i neposlani upit.");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await Promise.race([browser.close().catch(() => undefined), delay(2500)]);
  try {
    server.kill("SIGKILL");
  } catch {
    // Poslužitelj je već stao.
  }
  process.exit(process.exitCode ?? 0);
}
