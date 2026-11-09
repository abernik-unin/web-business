import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { poseAt } from "./pose";

type SceneOptions = {
  canvas: HTMLCanvasElement;
  status: HTMLElement;
  mobile: boolean;
  reduced: boolean;
};

const normal = new THREE.Vector3();
const origin = new THREE.Vector3();

function syncCut(mesh: THREE.Mesh, plane: THREE.Plane, axis: number): void {
  normal.set(axis, 0, 0).transformDirection(mesh.matrixWorld);
  origin.setFromMatrixPosition(mesh.matrixWorld);
  plane.setFromNormalAndCoplanarPoint(normal, origin);
  plane.constant += 0.012;
}

function makeCore(mobile: boolean): THREE.Group {
  const core = new THREE.Group();
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(mobile ? 0.11 : 0.14, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0x1490ff,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(mobile ? 0.07 : 0.09, 1),
    new THREE.MeshBasicMaterial({ color: 0x3ef0d8 }),
  );
  core.add(glow, heart);

  const nodes = mobile ? 14 : 26;
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < nodes; index += 1) {
    const radius = 0.16 + (index % 4) * 0.045;
    const phi = Math.acos(1 - (2 * (index + 0.5)) / nodes);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    points.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(radius));
  }
  const linePositions: number[] = [];
  const limit = mobile ? 0.16 : 0.18;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      if (!a || !b || a.distanceTo(b) > limit) continue;
      linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3)),
    new THREE.LineBasicMaterial({ color: 0x7af6ff, transparent: true, opacity: 0.8 }),
  );
  core.add(lines);

  const streamCount = mobile ? 70 : 160;
  const stream = new Float32Array(streamCount * 3);
  for (let index = 0; index < streamCount; index += 1) {
    const angle = (index / streamCount) * Math.PI * (mobile ? 6 : 10);
    const radius = 0.1 + (index % 6) * 0.028;
    stream[index * 3] = Math.cos(angle) * radius;
    stream[index * 3 + 1] = (index / streamCount - 0.5) * 0.62;
    stream[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const streams = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(stream, 3)),
    new THREE.PointsMaterial({ color: 0x3ef0d8, size: mobile ? 0.012 : 0.015, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  streams.name = "tokovi";
  core.add(streams);

  const lights = mobile ? 4 : 6;
  for (let index = 0; index < lights; index += 1) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff6a2c }),
    );
    const angle = (index / lights) * Math.PI * 2;
    lamp.position.set(Math.cos(angle) * 0.33, Math.sin(angle) * 0.12, Math.sin(angle) * 0.33);
    core.add(lamp);
  }
  return core;
}

export async function mountScene(options: SceneOptions): Promise<void> {
  const { canvas, status, mobile, reduced } = options;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !mobile,
      powerPreference: mobile ? "low-power" : "high-performance",
    });
  } catch {
    fail(status, canvas);
    return;
  }
  if (!renderer.getContext()) {
    fail(status, canvas);
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.06, 30);
  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xe7fffb, 0x0b1018, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(3.2, 4.2, 5);
  const rim = new THREE.DirectionalLight(0x2aa4e8, 2.1);
  rim.position.set(-4, 1.2, -2);
  const fill = new THREE.DirectionalLight(0x3ef0d8, 1.15);
  fill.position.set(0.4, -1.5, 3);
  const coreLight = new THREE.PointLight(0x3ef0d8, 0, 4);
  scene.add(key, rim, fill, coreLight);

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;
    pmrem.dispose();
  } catch {
    // Svjetla su dovoljna ako okolina ne uspije.
  }

  const resize = (): void => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  let modelUrl = `${import.meta.env.BASE_URL}models/${mobile ? "clock-mobile.glb" : "clock-web.glb"}`;
  if (!modelUrl.startsWith("/") && !modelUrl.startsWith(".")) modelUrl = `./${modelUrl}`;

  let source: THREE.Mesh | null = null;
  try {
    const gltf = await new GLTFLoader().loadAsync(modelUrl);
    gltf.scene.traverse((object) => {
      if (source || !(object instanceof THREE.Mesh)) return;
      source = object;
    });
  } catch {
    fail(status, canvas);
    return;
  }
  if (!source) {
    fail(status, canvas);
    return;
  }
  const mesh = source as THREE.Mesh;
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!material) {
    fail(status, canvas);
    return;
  }

  const leftPlane = new THREE.Plane();
  const rightPlane = new THREE.Plane();
  const leftMaterial = material.clone();
  const rightMaterial = material.clone();
  leftMaterial.clippingPlanes = [leftPlane];
  rightMaterial.clippingPlanes = [rightPlane];
  const left = new THREE.Mesh(mesh.geometry, leftMaterial);
  const right = new THREE.Mesh(mesh.geometry, rightMaterial);
  const core = makeCore(mobile);
  group.add(left, right, core);

  let progress = 0;
  const readProgress = (): void => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress = max <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / max));
  };
  readProgress();
  window.addEventListener("scroll", readProgress, { passive: true });

  const apply = (elapsed: number): void => {
    const pose = poseAt(reduced ? 0.08 : progress);
    const gap = pose.gap * (mobile ? 0.72 : 1);
    const depth = mobile ? pose.cameraZ * 1.08 + 0.2 : pose.cameraZ;
    left.position.x = -gap;
    right.position.x = gap;
    group.position.set(pose.modelX, mobile ? 0.28 : 0, 0);
    group.rotation.set(pose.rotX, pose.rotY, 0);
    group.updateMatrixWorld(true);
    syncCut(left, leftPlane, -1);
    syncCut(right, rightPlane, 1);
    const shown = reduced ? 0 : pose.core;
    core.scale.setScalar(0.2 + shown * 0.85);
    core.visible = shown > 0.03;
    coreLight.intensity = shown * (mobile ? 2.4 : 5.5);
    coreLight.position.set(pose.modelX, mobile ? 0.28 : 0, 0);
    const streams = core.getObjectByName("tokovi");
    if (streams) streams.rotation.y = shown * 2.2 + (reduced ? 0 : elapsed * 0.18);
    camera.position.set(pose.cameraX, pose.cameraY + (mobile ? 0.18 : 0), depth);
    camera.lookAt(pose.modelX, mobile ? 0.2 : 0, 0);
    renderer.render(scene, camera);
  };

  status.textContent = reduced
    ? "Mirni kadar sata je spreman. Animacija je isključena."
    : "Prostorni prikaz je spreman.";
  status.classList.add("je-spreman");
  document.body.classList.add("scena-sprema");
  if (reduced) document.body.classList.add("smanjen-pokret");

  let frame = 0;
  const started = performance.now();
  const loop = (): void => {
    apply((performance.now() - started) / 1000);
    if (!reduced && !document.hidden) frame = window.requestAnimationFrame(loop);
  };
  apply(0);
  if (!reduced) frame = window.requestAnimationFrame(loop);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reduced) {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(loop);
    }
  });
}

function fail(status: HTMLElement, canvas: HTMLCanvasElement): void {
  canvas.hidden = true;
  status.textContent = "Prostorni prikaz nije dostupan. Tekst stranice i dalje možete čitati.";
  status.classList.add("je-greska");
  document.body.classList.add("bez-webgl");
}
