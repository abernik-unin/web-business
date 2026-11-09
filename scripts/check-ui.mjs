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
  check((await page.$eval("h1", (node) => node.textContent?.trim()))?.includes("Predmet"), "Nedostaje naslov");
  check((await page.$eval("html", (node) => node.lang)) === "hr", "Jezik nije hr");
  check((await page.$$("h1")).length === 1, "Nije točno jedan h1");
  const enabled = await page.$eval("#posalji", (node) => node.disabled === false);
  check(enabled, "Gumb za upit ostao je isključen");

  const broken = await page.evaluate(() =>
    [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
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

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.evaluate(() => window.scrollTo(0, 0));
  if (shots) await page.screenshot({ path: `${artifacts}/naslovnica_hero_desktop.png` });
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  if (shots) await page.screenshot({ path: `${artifacts}/naslovnica_desktop.png`, fullPage: true });

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
  if (shots) await page.screenshot({ path: `${artifacts}/naslovnica_mobilna.png`, fullPage: true });
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
    const stages = [
      ["pocetak", 0],
      ["unutra", 0.55],
      ["jezgra", 0.86],
      ["kontakt", 1],
    ];
    for (const [label, width, height] of [
      ["desktop", 1440, 900],
      ["mobilna", 390, 844],
    ]) {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await prepare(page);
      await page.waitForFunction(
        () => {
          const node = document.querySelector("#scena-status");
          return node?.classList.contains("je-spreman") || node?.classList.contains("je-greska");
        },
        { timeout: 25000 },
      );
      await delay(500);
      for (const [name, progress] of stages) {
        await page.evaluate((value) => {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo(0, max * value);
        }, progress);
        await delay(450);
        await page.screenshot({ path: `${artifacts}/scena_${name}_${label}.png` });
      }
    }
  }

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(base, { waitUntil: "networkidle0" });
  await page.waitForFunction(
    () => document.querySelector("#scena-status")?.textContent?.includes("isključena"),
    { timeout: 25000 },
  );
  const cursorCount = await page.$$eval(".kursor", (nodes) => nodes.length);
  check(cursorCount === 0, "Kursor je uključen iako je pokret smanjen");

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
