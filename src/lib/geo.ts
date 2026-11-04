import { feature } from "topojson-client";

export type Pt = [number, number];
export type Ring = Pt[];
export type BBox = { x: number; y: number; w: number; h: number };
export type PrefShape = {
  code: string;
  name: string;
  d: string; // SVG パス
  inset: boolean;
  bbox: BBox;
  polygons: Ring[][]; // [外周, 穴...] の配列（SVG 座標系・y 下向き）
  anchor: Pt; // 柱・ラベルを立てる位置（最大ポリゴンの重心）
};
export type MapGeometry = { width: number; height: number; shapes: PrefShape[]; insetBox: BBox };

type Topo = { type: "Topology"; objects: Record<string, unknown>; arcs: number[][][] };

const RAD = Math.PI / 180;
// メルカトル図法（全県同一の縮尺）
const merc = (lon: number, lat: number): Pt => [lon, Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / RAD];

// 沖縄県は日本海側の空白へ平行移動して別枠表示する（縮尺は本土と同じ）
const OKINAWA = "47";
const INSET_SHIFT: Pt = [5.0, 19.8]; // 投影座標系での移動量（経度相当, 緯度相当）
// 小笠原諸島・沖ノ鳥島・南鳥島などの遠隔の島（北緯30度以南の東京都）は表示範囲外として省略する
const isRemoteTokyo = (code: string, ring: Ring) => code === "13" && ring.every(([, lat]) => lat < 30);

export function buildGeometry(topo: Topo, width: number): MapGeometry {
  const obj = Object.values(topo.objects)[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fc = feature(topo as any, obj as any) as unknown as {
    features: { properties: { id: number; nam_ja: string }; geometry: { type: string; coordinates: unknown } }[];
  };

  const items: { code: string; name: string; inset: boolean; polygons: Ring[][] }[] = [];
  for (const f of fc.features) {
    const code = String(f.properties.id).padStart(2, "0");
    const inset = code === OKINAWA;
    const src = f.geometry.type === "Polygon" ? [f.geometry.coordinates as Ring[]] : (f.geometry.coordinates as Ring[][]);
    const polygons: Ring[][] = [];
    for (const poly of src) {
      if (isRemoteTokyo(code, poly[0])) continue;
      polygons.push(
        poly.map((ring) =>
          ring.map(([lon, lat]) => {
            const [x, y] = merc(lon, lat);
            return (inset ? [x + INSET_SHIFT[0], y + INSET_SHIFT[1]] : [x, y]) as Pt;
          }),
        ),
      );
    }
    items.push({ code, name: f.properties.nam_ja, inset, polygons });
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items)
    for (const poly of it.polygons)
      for (const [x, y] of poly[0]) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }

  const pad = 10;
  const s = (width - pad * 2) / (maxX - minX);
  const height = Math.ceil((maxY - minY) * s + pad * 2);
  const tp = ([x, y]: Pt): Pt => [pad + (x - minX) * s, pad + (maxY - y) * s];

  const shapes: PrefShape[] = items.map((it) => {
    const polygons = it.polygons.map((poly) => poly.map((ring) => ring.map(tp)));
    const outer = polygons.map((p) => p[0]);
    const biggest = outer.reduce((a, b) => (Math.abs(area(b)) > Math.abs(area(a)) ? b : a));
    return {
      code: it.code,
      name: it.name,
      inset: it.inset,
      polygons,
      bbox: bboxOf(outer.flat()),
      anchor: interiorPoint(biggest),
      d: polygons
        .flat()
        .map((r) => "M" + r.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z")
        .join(""),
    };
  });
  shapes.sort((a, b) => a.code.localeCompare(b.code));

  const ins = shapes.find((x) => x.inset)!.bbox;
  const m = 6;
  const insetBox = { x: ins.x - m, y: ins.y - m, w: ins.w + m * 2, h: ins.h + m * 2 };
  return { width, height, shapes, insetBox };
}

function bboxOf(pts: Pt[]): BBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function area(r: Ring) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return a / 2;
}

function inside([x, y]: Pt, r: Ring) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// 重心が外に出る形（三日月形など）では、重心の高さで切った最も長い内側区間の中点を使う
function interiorPoint(r: Ring): Pt {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    cx += (r[j][0] + r[i][0]) * f;
    cy += (r[j][1] + r[i][1]) * f;
    a += f;
  }
  const c: Pt = [cx / (3 * a), cy / (3 * a)];
  if (inside(c, r)) return c;
  const xs: number[] = [];
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > c[1] !== yj > c[1]) xs.push(xi + ((c[1] - yi) * (xj - xi)) / (yj - yi));
  }
  xs.sort((p, q) => p - q);
  let best: Pt = c, len = -1;
  for (let i = 0; i + 1 < xs.length; i += 2)
    if (xs[i + 1] - xs[i] > len) {
      len = xs[i + 1] - xs[i];
      best = [(xs[i] + xs[i + 1]) / 2, c[1]];
    }
  return best;
}
