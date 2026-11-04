import { useEffect, useRef, type KeyboardEvent } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { MapGeometry } from "../lib/geo";
import { fmtRate, IND_COLOR, type Indicator, type Rec } from "../lib/data";
import { useI18n } from "../lib/i18n";
import type { HoverState } from "./HoverCard";

type Props = {
  geo: MapGeometry;
  byCode: Map<string, Rec>;
  nation: Rec | undefined;
  selected: string;
  onSelect: (code: string) => void;
  zoomed: boolean;
  onReset: () => void;
  onHover: (h: HoverState) => void;
  onFail: () => void;
};

// ---- 定数（ワールド座標は地図SVGの単位。幅520） ----
const BASE_Z = 3; // 県の板の厚み
const HS = 120; // 行動者率100%のときの柱の高さ（2本共通の固定尺度）
const R = 1.9; // 柱の半径
const OFF = 2.2; // 2本の柱の間隔の半分
const ANIM_MS = 900;
const INDS: Indicator[] = ["cinemaRate", "outsideCinemaRate"];
const COL = {
  bg: 0x070609,
  top: 0x26212c,
  topSel: 0x4b3d28,
  topHover: 0x342d3c,
  side: 0x141118,
  line: 0x4d4555,
  lineSel: 0xffe2a0,
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

type Cam = { tx: number; ty: number; tz: number; dist: number; polar: number; az: number };

type Ctx = {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  bases: Map<string, { mesh: THREE.Mesh; top: THREE.MeshStandardMaterial; line: THREE.LineBasicMaterial }>;
  pillars: Map<string, Record<Indicator, THREE.Mesh>>;
  heights: Map<string, Record<Indicator, { cur: number; goal: number }>>;
  pickables: THREE.Object3D[];
  deco: THREE.Group;
  rings: Record<Indicator, THREE.Mesh>;
  cam: Cam;
  camFrom: Cam;
  camGoal: Cam;
  camT0: number;
  parallax: { x: number; y: number; gx: number; gy: number };
  az: number;
  hovered: string | null;
  size: { w: number; h: number };
};

// SVG座標（y下向き）→ ワールド座標（x右・y北・z上）
const toWorld = (geo: MapGeometry, [x, y]: [number, number]) => new THREE.Vector2(x - geo.width / 2, geo.height / 2 - y);

export function CinemaStage({ geo, byCode, nation, selected, onSelect, zoomed, onReset, onHover, onFail }: Props) {
  const { t, prefName } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const ctxRef = useRef<Ctx | null>(null);
  const propsRef = useRef({ selected, zoomed, onSelect, onHover });
  propsRef.current = { selected, zoomed, onSelect, onHover };

  // ---------- シーン構築（初回のみ） ----------
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(COL.bg);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(COL.bg, 400, 1600);
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 5000);
    camera.up.set(0, 0, 1);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff1dd, 1.1);
    key.position.set(-300, -200, 600);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899ff, 0.35);
    rim.position.set(300, 400, 200);
    scene.add(rim);

    // 県の板
    const bases: Ctx["bases"] = new Map();
    const pickables: THREE.Object3D[] = [];
    const sideMat = new THREE.MeshStandardMaterial({ color: COL.side, roughness: 1 });
    for (const s of geo.shapes) {
      const shapes = s.polygons.map((poly) => {
        const sh = new THREE.Shape(poly[0].map((p) => toWorld(geo, p)));
        for (const hole of poly.slice(1)) sh.holes.push(new THREE.Path(hole.map((p) => toWorld(geo, p))));
        return sh;
      });
      const g = new THREE.ExtrudeGeometry(shapes, { depth: BASE_Z, bevelEnabled: false });
      const top = new THREE.MeshStandardMaterial({ color: COL.top, roughness: 0.85, metalness: 0.05 });
      const mesh = new THREE.Mesh(g, [top, sideMat]);
      mesh.userData.code = s.code;
      scene.add(mesh);
      pickables.push(mesh);
      const line = new THREE.LineBasicMaterial({ color: COL.line, transparent: true, opacity: 0.9 });
      for (const poly of s.polygons) {
        const pts = poly[0].map((p) => {
          const v = toWorld(geo, p);
          return new THREE.Vector3(v.x, v.y, BASE_Z + 0.05);
        });
        const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), line);
        scene.add(l);
      }
      bases.set(s.code, { mesh, top, line });
    }

    // 沖縄県の別枠
    {
      const b = geo.insetBox;
      const c = [
        [b.x, b.y],
        [b.x + b.w, b.y],
        [b.x + b.w, b.y + b.h],
        [b.x, b.y + b.h],
      ].map((p) => {
        const v = toWorld(geo, p as [number, number]);
        return new THREE.Vector3(v.x, v.y, 0.2);
      });
      const l = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(c),
        new THREE.LineDashedMaterial({ color: 0x5a5262, dashSize: 4, gapSize: 4 }),
      );
      l.computeLineDistances();
      scene.add(l);
    }

    // 柱（高さはスケールで表現。底面が z=0 の単位円柱）
    const cyl = new THREE.CylinderGeometry(R, R, 1, 20, 1);
    cyl.rotateX(Math.PI / 2);
    cyl.translate(0, 0, 0.5);
    const pillars: Ctx["pillars"] = new Map();
    const heights: Ctx["heights"] = new Map();
    for (const s of geo.shapes) {
      const rec = {} as Record<Indicator, THREE.Mesh>;
      for (const k of INDS) {
        const m = new THREE.Mesh(
          cyl,
          new THREE.MeshStandardMaterial({
            color: IND_COLOR[k],
            emissive: IND_COLOR[k],
            emissiveIntensity: 0.55,
            roughness: 0.4,
            transparent: true,
            opacity: 1,
          }),
        );
        m.userData.code = s.code;
        m.scale.z = 0.001;
        scene.add(m);
        pickables.push(m);
        rec[k] = m;
      }
      pillars.set(s.code, rec);
      heights.set(s.code, { cinemaRate: { cur: 0, goal: 0 }, outsideCinemaRate: { cur: 0, goal: 0 } });
    }

    // 選択県の装飾：目盛り付きの物差しと全国値の輪
    const deco = new THREE.Group();
    const rulerMat = new THREE.LineBasicMaterial({ color: 0xd8cfc0, transparent: true, opacity: 0.55 });
    const rpts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, HS)];
    for (const t of [25, 50, 75, 100]) {
      const z = (t / 100) * HS;
      rpts.push(new THREE.Vector3(0, 0, z), new THREE.Vector3(t === 50 || t === 100 ? 3.2 : 1.8, 0, z));
    }
    const ruler = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rpts), rulerMat);
    ruler.name = "ruler";
    deco.add(ruler);
    const rings = {} as Record<Indicator, THREE.Mesh>;
    for (const k of INDS) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(R * 1.55, R * 2.05, 32),
        new THREE.MeshBasicMaterial({ color: IND_COLOR[k], transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
      );
      deco.add(ring);
      rings[k] = ring;
    }
    scene.add(deco);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.35);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const cam0: Cam = { tx: 0, ty: 0, tz: 0, dist: 1200, polar: 0.95, az: 0.5 };
    const ctx: Ctx = {
      renderer, composer, bloom, scene, camera,
      raycaster: new THREE.Raycaster(),
      bases, pillars, heights, pickables, deco, rings,
      cam: { ...cam0 }, camFrom: { ...cam0 }, camGoal: { ...cam0 }, camT0: 0,
      parallax: { x: 0, y: 0, gx: 0, gy: 0 },
      az: 0.5,
      hovered: null,
      size: { w: 1, h: 1 },
    };
    ctxRef.current = ctx;

    // ---------- サイズ ----------
    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      ctx.size = { w, h };
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      ctx.az = w / h >= 1 ? 0.38 : 0.1; // 横長の画面では列島が横に並ぶ向きから見る
      layoutPillars(ctx, geo);
      retarget(ctx, geo, propsRef.current.selected, propsRef.current.zoomed, true);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // ---------- 操作 ----------
    const pick = (e: PointerEvent): string | null => {
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ctx.raycaster.setFromCamera(ndc, camera);
      const hit = ctx.raycaster.intersectObjects(ctx.pickables, false)[0];
      return (hit?.object.userData.code as string) ?? null;
    };
    let down: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (e.pointerType === "mouse") {
        ctx.parallax.gx = ((e.clientX - r.left) / r.width) * 2 - 1;
        ctx.parallax.gy = ((e.clientY - r.top) / r.height) * 2 - 1;
        const code = pick(e);
        setHovered(ctx, code);
        propsRef.current.onHover(code ? { code, x: e.clientX, y: e.clientY } : null);
        canvas.style.cursor = code ? "pointer" : "default";
      }
    };
    const onLeave = () => {
      ctx.parallax.gx = 0;
      ctx.parallax.gy = 0;
      setHovered(ctx, null);
      propsRef.current.onHover(null);
    };
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const code = pick(e);
      if (code) propsRef.current.onSelect(code);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    // スマホの傾き（許可不要な環境のみ）で視差
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      ctx.parallax.gx = Math.max(-1, Math.min(1, e.gamma / 25));
      ctx.parallax.gy = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    };
    const needsPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";
    if (!needsPermission) window.addEventListener("deviceorientation", onTilt);

    // ---------- 描画ループ ----------
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const rm = reduceMotion();
      // カメラ遷移
      const t = rm ? 1 : Math.min(1, (now - ctx.camT0) / ANIM_MS);
      const k = ease(t);
      for (const key of Object.keys(ctx.cam) as (keyof Cam)[])
        ctx.cam[key] = ctx.camFrom[key] + (ctx.camGoal[key] - ctx.camFrom[key]) * k;
      // 視差（なめらかに追従）
      const pf = rm ? 0 : 1 - Math.pow(0.002, dt / 1000);
      ctx.parallax.x += ((rm ? 0 : ctx.parallax.gx) - ctx.parallax.x) * pf;
      ctx.parallax.y += ((rm ? 0 : ctx.parallax.gy) - ctx.parallax.y) * pf;
      placeCamera(camera, ctx.cam, ctx.parallax.x * 0.12, ctx.parallax.y * 0.06);
      // 柱の伸縮
      const hf = rm ? 1 : 1 - Math.pow(0.0005, dt / 1000);
      for (const [code, h] of ctx.heights)
        for (const ind of INDS) {
          const v = h[ind];
          v.cur += (v.goal - v.cur) * hf;
          ctx.pillars.get(code)![ind].scale.z = Math.max(0.001, v.cur);
        }
      // 霧は視点距離に合わせる
      const fog = scene.fog as THREE.Fog;
      fog.near = ctx.cam.dist * 0.75;
      fog.far = ctx.cam.dist * 2.4;
      composer.render();
      updateLabels(ctx, labelRefs.current, propsRef.current.selected);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      window.removeEventListener("deviceorientation", onTilt);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else (mat as THREE.Material | undefined)?.dispose();
      });
      composer.dispose();
      renderer.dispose();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  // ---------- データ（性別切替）→ 柱の高さ ----------
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    for (const [code, h] of ctx.heights)
      for (const k of INDS) {
        const v = byCode.get(code)?.[k];
        h[k].goal = v == null ? 0 : (v / 100) * HS;
        ctx.pillars.get(code)![k].visible = v != null; // 欠損は0の柱にしない
      }
    placeDeco(ctx, geo, selected, nation);
  }, [byCode, nation, geo, selected]);

  // ---------- 選択・ズーム ----------
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    applyHighlight(ctx, selected, zoomed);
    placeDeco(ctx, geo, selected, nation);
    retarget(ctx, geo, selected, zoomed, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, zoomed, geo]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = Number(selected);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = n >= 47 ? 1 : n + 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = n <= 1 ? 47 : n - 1;
    if (e.key === "Home") next = 1;
    if (e.key === "End") next = 47;
    if (e.key === "Escape" && zoomed) {
      e.preventDefault();
      onReset();
    }
    if (next != null) {
      e.preventDefault();
      onSelect(String(next).padStart(2, "0"));
    }
  };

  const sel = byCode.get(selected);
  return (
    <div
      ref={wrapRef}
      className="stage3d"
      tabIndex={0}
      role="application"
      aria-roledescription={t.stageRole}
      aria-label={t.stageAria(prefName(sel), fmtRate(sel?.cinemaRate ?? null), fmtRate(sel?.outsideCinemaRate ?? null))}
      onKeyDown={onKey}
    >
      <canvas ref={canvasRef} />
      <div className="stage3d-labels" aria-hidden="true">
        <div ref={(el) => (labelRefs.current.name = el)} className="s3-name">
          {prefName(sel)}
        </div>
        {INDS.map((k) => (
          <div key={k} ref={(el) => (labelRefs.current[k] = el)} className={`s3-val s3-${k}`}>
            <span>{t.ind[k]}</span> {fmtRate(sel?.[k] ?? null)}
          </div>
        ))}
        <div ref={(el) => (labelRefs.current.r100 = el)} className="s3-tick">100%</div>
      </div>
      <p className="stage3d-note">{t.stageNote}</p>
    </div>
  );
}

// ---------- ヘルパー ----------
function placeCamera(camera: THREE.PerspectiveCamera, c: Cam, dAz = 0, dPolar = 0) {
  const az = c.az + dAz;
  const polar = Math.max(0.2, Math.min(1.35, c.polar + dPolar));
  camera.position.set(
    c.tx + c.dist * Math.sin(polar) * Math.sin(az),
    c.ty - c.dist * Math.sin(polar) * Math.cos(az),
    c.tz + c.dist * Math.cos(polar),
  );
  camera.lookAt(c.tx, c.ty, c.tz);
  camera.updateMatrixWorld();
}

// 指定した点がすべて画面内に収まる距離を二分探索で求める
function fitDistance(camera: THREE.PerspectiveCamera, c: Omit<Cam, "dist">, pts: THREE.Vector3[], margin = 0.86) {
  let lo = 20, hi = 6000;
  const v = new THREE.Vector3();
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    placeCamera(camera, { ...c, dist: mid });
    let ok = true;
    for (const p of pts) {
      v.copy(p).project(camera);
      if (Math.abs(v.x) > margin || Math.abs(v.y) > margin || v.z > 1) {
        ok = false;
        break;
      }
    }
    if (ok) hi = mid;
    else lo = mid;
  }
  return hi;
}

function retarget(ctx: Ctx, geo: MapGeometry, code: string, zoomed: boolean, instant: boolean) {
  const s = geo.shapes.find((x) => x.code === code);
  let goal: Cam;
  if (zoomed && s) {
    const a = toWorld(geo, s.anchor);
    const half = Math.max(s.bbox.w, s.bbox.h, 80) * 1.0;
    const pts: THREE.Vector3[] = [];
    for (const dx of [-half, half]) for (const dy of [-half, half]) pts.push(new THREE.Vector3(a.x + dx, a.y + dy, 0));
    pts.push(new THREE.Vector3(a.x, a.y, HS * 1.02));
    const base = { tx: a.x, ty: a.y, tz: HS * 0.28, polar: 0.88, az: ctx.az };
    goal = { ...base, dist: fitDistance(ctx.camera, base, pts, 0.8) };
  } else {
    // 実際の県の外形（各県の外接矩形の角）と、柱の最大の高さが収まるように引く
    const pts: THREE.Vector3[] = [];
    for (const sh of geo.shapes) {
      const b = sh.bbox;
      for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]] as [number, number][]) {
        const v = toWorld(geo, [x, y]);
        pts.push(new THREE.Vector3(v.x, v.y, 0));
      }
      const a = toWorld(geo, sh.anchor);
      pts.push(new THREE.Vector3(a.x, a.y, HS * 0.66));
    }
    const c = new THREE.Box3().setFromPoints(pts).getCenter(new THREE.Vector3());
    const base = { tx: c.x, ty: c.y, tz: HS * 0.15, polar: 0.82, az: ctx.az };
    goal = { ...base, dist: fitDistance(ctx.camera, base, pts, 0.94) };
  }
  ctx.camFrom = { ...ctx.cam };
  ctx.camGoal = goal;
  ctx.camT0 = instant ? -1e9 : performance.now();
  if (instant) ctx.cam = { ...goal };
}

// 2本の柱を視線と直交する向きに並べ、どちらも隠れないようにする
function layoutPillars(ctx: Ctx, geo: MapGeometry) {
  const rx = Math.cos(ctx.az), ry = Math.sin(ctx.az);
  for (const s of geo.shapes) {
    const a = toWorld(geo, s.anchor);
    const p = ctx.pillars.get(s.code)!;
    p.cinemaRate.position.set(a.x - rx * OFF, a.y - ry * OFF, BASE_Z);
    p.outsideCinemaRate.position.set(a.x + rx * OFF, a.y + ry * OFF, BASE_Z);
  }
  ctx.deco.rotation.z = ctx.az;
}

function placeDeco(ctx: Ctx, geo: MapGeometry, code: string, nation: Rec | undefined) {
  const s = geo.shapes.find((x) => x.code === code);
  if (!s) return;
  const a = toWorld(geo, s.anchor);
  ctx.deco.position.set(a.x, a.y, BASE_Z);
  const ruler = ctx.deco.getObjectByName("ruler")!;
  ruler.position.set(OFF + R * 3, 0, 0);
  for (const k of INDS) {
    const sign = k === "cinemaRate" ? -1 : 1;
    const v = nation?.[k];
    const ring = ctx.rings[k];
    ring.visible = v != null;
    // deco は az だけ回転しているので、ローカル x 方向が柱の並び方向
    ring.position.set(sign * OFF, 0, ((v ?? 0) / 100) * HS);
  }
}

function applyHighlight(ctx: Ctx, selected: string, zoomed: boolean) {
  for (const [code, b] of ctx.bases) {
    const isSel = code === selected;
    b.top.color.setHex(isSel ? COL.topSel : code === ctx.hovered ? COL.topHover : COL.top);
    b.top.emissive.setHex(isSel ? 0x3a2a10 : 0x000000);
    b.line.color.setHex(isSel ? COL.lineSel : COL.line);
    b.line.opacity = zoomed && !isSel ? 0.45 : 0.9;
  }
  for (const [code, p] of ctx.pillars)
    for (const k of INDS) {
      const m = p[k].material as THREE.MeshStandardMaterial;
      const isSel = code === selected;
      m.opacity = zoomed && !isSel ? 0.16 : 1;
      m.emissiveIntensity = isSel ? 1.1 : zoomed ? 0.15 : 0.5;
      m.depthWrite = m.opacity === 1;
    }
}

function setHovered(ctx: Ctx, code: string | null) {
  if (ctx.hovered === code) return;
  const prev = ctx.hovered;
  ctx.hovered = code;
  for (const c of [prev, code]) {
    if (!c) continue;
    const b = ctx.bases.get(c);
    if (!b || b.top.emissive.getHex() !== 0) continue; // 選択中の県はそのまま
    b.top.color.setHex(c === code ? COL.topHover : COL.top);
  }
}

const tmp = new THREE.Vector3();
type Anchor = "left" | "right" | "above";
function updateLabels(ctx: Ctx, refs: Record<string, HTMLDivElement | null>, selected: string) {
  const p = ctx.pillars.get(selected);
  if (!p) return;
  const { w, h } = ctx.size;
  // 3D の点を画面座標へ投影し、ラベルが枠からはみ出さないよう位置を詰める
  const place = (el: HTMLDivElement | null, v: THREE.Vector3, anchor: Anchor) => {
    if (!el) return;
    tmp.copy(v).project(ctx.camera);
    const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
    el.style.opacity = vis ? "1" : "0";
    const px = ((tmp.x + 1) / 2) * w;
    const py = ((1 - tmp.y) / 2) * h;
    const ew = el.offsetWidth, eh = el.offsetHeight;
    let x = anchor === "left" ? px - ew - 10 : anchor === "right" ? px + 10 : px - ew / 2;
    let y = anchor === "above" ? py - eh - 26 : py - eh / 2;
    x = Math.max(4, Math.min(w - ew - 4, x));
    y = Math.max(4, Math.min(h - eh - 4, y));
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const top = (m: THREE.Mesh) => new THREE.Vector3(m.position.x, m.position.y, m.position.z + m.scale.z);
  const c = top(p.cinemaRate);
  const o = top(p.outsideCinemaRate);
  place(refs.cinemaRate, c, "left");
  place(refs.outsideCinemaRate, o, "right");
  place(refs.name, new THREE.Vector3((c.x + o.x) / 2, (c.y + o.y) / 2, Math.max(c.z, o.z)), "above");
  const ruler = ctx.deco.getObjectByName("ruler")!;
  place(refs.r100, new THREE.Vector3(0, 0, HS).applyMatrix4(ruler.matrixWorld), "right");
}
