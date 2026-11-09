type Spark = {
  element: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

export function mountCursor(): void {
  const cursor = document.createElement("div");
  cursor.className = "kursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.append(cursor);
  document.body.classList.add("kursor-aktivan");

  const sparks: Spark[] = [];
  let x = -100;
  let y = -100;
  let seen = false;
  let lastEmit = 0;

  const emit = (hot: boolean): void => {
    const amount = hot ? 2 : 1;
    for (let index = 0; index < amount; index += 1) {
      if (sparks.length > 16) sparks.shift()?.element.remove();
      const element = document.createElement("span");
      element.className = "iskra";
      const color = index % 2 === 0 ? "#3ef0d8" : "#2aa4e8";
      element.style.color = color;
      element.style.background = color;
      document.body.append(element);
      const angle = Math.random() * Math.PI * 2;
      const speed = hot ? 1.5 + Math.random() * 1.2 : 0.45 + Math.random() * 0.7;
      sparks.push({
        element,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
      });
    }
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      const nextX = event.clientX;
      const nextY = event.clientY;
      const target = document.elementFromPoint(nextX, nextY);
      const field = target instanceof Element && Boolean(target.closest("input, textarea, select"));
      const hot = target instanceof Element && Boolean(target.closest("a, button"));
      cursor.classList.toggle("je-skriven", field);
      const scale = hot && !field ? 1.45 : 1;
      cursor.style.transform = `translate(${nextX}px, ${nextY}px) scale(${scale})`;
      const moved = Math.hypot(nextX - x, nextY - y);
      const now = performance.now();
      if (seen && !field && moved > 6 && now - lastEmit > (hot ? 26 : 48)) {
        lastEmit = now;
        x = nextX;
        y = nextY;
        emit(hot);
      }
      x = nextX;
      y = nextY;
      seen = true;
    },
    { passive: true },
  );

  const tick = (): void => {
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      if (!spark) continue;
      spark.life -= 0.045;
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.element.style.transform = `translate(${spark.x}px, ${spark.y}px)`;
      spark.element.style.opacity = String(Math.max(0, spark.life));
      if (spark.life <= 0) {
        spark.element.remove();
        sparks.splice(index, 1);
      }
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}
