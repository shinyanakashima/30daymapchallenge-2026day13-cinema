import { feature } from "topojson-client";

export type BBox = { x: number; y: number; w: number; h: number };
export type PrefShape = { code: string; name: string; d: string; inset: boolean; bbox: BBox };
export type MapGeometry = { width: number; height: number; shapes: PrefShape[]; insetBox: { x: number; y: number; w: number; h: number } };

type Topo = { type: "Topology"; objects: Record<string, unknown>; arcs: number[][][] };
type Ring = [number, number][];

const RAD = Math.PI / 180;
// メルカトル図法（全県同一の縮尺）
const merc = (lon: number, lat: number): [number, number] => [lon, Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / RAD];

// 沖縄県は日本海側の空白へ平行移動して別枠表示する（縮尺は本土と同じ）
const OKINAWA = "47";
const INSET_SHIFT: [number, number] = [5.0, 19.8]; // 投影座標系での移動量（経度相当, 緯度相当）
// 小笠原諸島・沖ノ鳥島・南鳥島などの遠隔の島（北緯30度以南の東京都）は表示範囲外として省略する
const isRemoteTokyo = (code: string, ring: Ring) => code === "13" && ring.every(([, lat]) => lat < 30);

export function buildGeometry(topo: Topo, width: number): MapGeometry {
  const obj = Object.values(topo.objects)[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fc = feature(topo as any, obj as any) as unknown as {
    features: { properties: { id: number; nam_ja: string }; geometry: { type: string; coordinates: unknown } }[];
  };

  const items: { code: string; name: string; inset: boolean; polys: Ring[] }[] = [];
  for (const f of fc.features) {
    const code = String(f.properties.id).padStart(2, "0");
    const inset = code === OKINAWA;
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as Ring[]]
        : (f.geometry.coordinates as Ring[][]);
    const rings: Ring[] = [];
    for (const poly of polys) {
      for (const ring of poly) {
        if (isRemoteTokyo(code, ring)) continue;
        rings.push(
          ring.map(([lon, lat]) => {
            const [x, y] = merc(lon, lat);
            return inset ? [x + INSET_SHIFT[0], y + INSET_SHIFT[1]] : [x, y];
          }),
        );
      }
    }
    items.push({ code, name: f.properties.nam_ja, inset, polys: rings });
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let iMinX = Infinity, iMinY = Infinity, iMaxX = -Infinity, iMaxY = -Infinity;
  for (const it of items)
    for (const r of it.polys)
      for (const [x, y] of r) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        if (it.inset) {
          iMinX = Math.min(iMinX, x); iMaxX = Math.max(iMaxX, x);
          iMinY = Math.min(iMinY, y); iMaxY = Math.max(iMaxY, y);
        }
      }

  const pad = 10;
  const s = (width - pad * 2) / (maxX - minX);
  const height = Math.ceil((maxY - minY) * s + pad * 2);
  const tx = (x: number) => pad + (x - minX) * s;
  const ty = (y: number) => pad + (maxY - y) * s;

  const shapes = items.map((it) => ({
    code: it.code,
    name: it.name,
    inset: it.inset,
    bbox: bboxOf(it.polys.flat().map(([x, y]) => [tx(x), ty(y)] as [number, number])),
    d: it.polys.map((r) => "M" + r.map(([x, y]) => `${tx(x).toFixed(1)},${ty(y).toFixed(1)}`).join("L") + "Z").join(""),
  }));
  shapes.sort((a, b) => a.code.localeCompare(b.code));

  const m = 6;
  const insetBox = { x: tx(iMinX) - m, y: ty(iMaxY) - m, w: (iMaxX - iMinX) * s + m * 2, h: (iMaxY - iMinY) * s + m * 2 };
  return { width, height, shapes, insetBox };
}

function bboxOf(pts: [number, number][]): BBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
