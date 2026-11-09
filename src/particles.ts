type Dot = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  color: string;
};

const COLORS = ["#3ef0d8", "#2aa4e8", "#7af6ff"];

export function mountParticles(
  canvas: HTMLCanvasElement,
  options: { reduced: boolean; mobile: boolean },
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const count = options.mobile ? 26 : 54;
  const dots: Dot[] = Array.from({ length: count }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.6 + (index % 3) * 0.35,
    vx: (Math.random() - 0.5) * 0.00035,
    vy: -0.00015 - Math.random() * 0.00035,
    color: COLORS[index % COLORS.length] ?? COLORS[0],
  }));

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio || 1, options.mobile ? 1.25 : 1.5);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
  };

  const draw = (): void => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const dot of dots) {
      context.beginPath();
      context.fillStyle = dot.color;
      context.globalAlpha = 0.75;
      context.arc(dot.x * canvas.width, dot.y * canvas.height, dot.r * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };

  resize();
  draw();
  window.addEventListener("resize", () => {
    resize();
    if (options.reduced) draw();
  });
  if (options.reduced) return;

  const step = (): void => {
    for (const dot of dots) {
      dot.x += dot.vx;
      dot.y += dot.vy;
      if (dot.y < -0.02) dot.y = 1.02;
      if (dot.x < -0.02) dot.x = 1.02;
      if (dot.x > 1.02) dot.x = -0.02;
    }
    draw();
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}
