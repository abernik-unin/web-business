import { describe, expect, it } from "vitest";
import { poseAt } from "../src/pose";

describe("poseAt", () => {
  it("veže otvaranje i dubinu kamere uz položaj, pa se isti kadar vraća unatrag", () => {
    const start = poseAt(0);
    const middle = poseAt(0.62);
    const end = poseAt(1);
    expect(start.gap).toBe(0);
    expect(start.core).toBe(0);
    expect(end.core).toBe(1);
    expect(end.gap).toBeGreaterThan(middle.gap);
    expect(end.cameraZ).toBeLessThan(start.cameraZ);
    expect(poseAt(0.41)).toEqual(poseAt(0.41));

    let previous = start;
    for (let step = 1; step <= 24; step += 1) {
      const next = poseAt(step / 24);
      expect(next.cameraZ).toBeLessThanOrEqual(previous.cameraZ + 1e-6);
      expect(next.gap).toBeGreaterThanOrEqual(previous.gap - 1e-6);
      expect(next.core).toBeGreaterThanOrEqual(previous.core - 1e-6);
      previous = next;
    }
  });
});
