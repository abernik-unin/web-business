export type Pose = {
  rotX: number;
  rotY: number;
  gap: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  modelX: number;
  core: number;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

const smooth = (amount: number): number => {
  const t = clamp01(amount);
  return t * t * (3 - 2 * t);
};

const along = (t: number, keys: readonly (readonly [number, number])[]): number => {
  const progress = clamp01(t);
  const first = keys[0];
  if (!first || progress <= first[0]) return first ? first[1] : 0;
  for (let index = 1; index < keys.length; index += 1) {
    const previous = keys[index - 1];
    const next = keys[index];
    if (!previous || !next || progress > next[0]) continue;
    const span = next[0] - previous[0] || 1;
    return lerp(previous[1], next[1], smooth((progress - previous[0]) / span));
  }
  const last = keys[keys.length - 1];
  return last ? last[1] : 0;
};

export function poseAt(t: number): Pose {
  return {
    rotX: along(t, [
      [0, 0.2],
      [0.6, 0.04],
      [1, 0],
    ]),
    rotY: along(t, [
      [0, Math.PI - 0.45],
      [0.32, Math.PI + 0.7],
      [0.62, Math.PI + 0.08],
      [1, Math.PI],
    ]),
    gap: along(t, [
      [0, 0],
      [0.36, 0.02],
      [0.74, 0.72],
      [1, 0.8],
    ]),
    cameraX: along(t, [
      [0, 0.15],
      [1, 0],
    ]),
    cameraY: along(t, [
      [0, 0.08],
      [1, 0.02],
    ]),
    cameraZ: along(t, [
      [0, 4.05],
      [0.34, 2.55],
      [0.68, 1.85],
      [1, 1.48],
    ]),
    modelX: along(t, [
      [0, -0.78],
      [0.5, -0.28],
      [1, -0.08],
    ]),
    core: along(t, [
      [0, 0],
      [0.46, 0],
      [0.78, 1],
      [1, 1],
    ]),
  };
}
