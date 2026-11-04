export type Sex = "total" | "male" | "female";
export type Indicator = "cinemaRate" | "outsideCinemaRate";

export type Rec = {
  prefectureCode: string;
  prefectureName: string;
  sex: Sex;
  cinemaRate: number | null;
  outsideCinemaRate: number | null;
  sampleSize: number | null;
  estimatedPopulationThousands: number | null;
  missingReason: string | null;
};

export type Dataset = {
  source: { survey: string; table: string; url: string; retrievedAt: string };
  period: { referenceDate: string; from: string; to: string; population: string; definition: string };
  indicators: Record<Indicator, string>;
  records: Rec[];
};

export const SEX_LABEL: Record<Sex, string> = { total: "男女計", male: "男性", female: "女性" };
export const IND_LABEL: Record<Indicator, string> = { cinemaRate: "映画館", outsideCinemaRate: "映画館以外" };
export const IND_SUB: Record<Indicator, string> = {
  cinemaRate: "映画館での映画鑑賞",
  outsideCinemaRate: "映画館以外での映画鑑賞（テレビ・DVD・パソコンなど）",
};
export const NATIONAL = "00";

export async function loadDataset(): Promise<Dataset> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/cinema_2021.json`);
  if (!res.ok) throw new Error(`統計データを読み込めませんでした（HTTP ${res.status}）`);
  return res.json();
}

export function indexBy(records: Rec[]): Map<string, Rec> {
  return new Map(records.map((r) => [`${r.prefectureCode}|${r.sex}`, r]));
}

export const fmtRate = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

// 差は表示上の小数1桁同士の差（浮動小数誤差を避けるため整数化して計算）
export function diffPt(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return (Math.round(a * 10) - Math.round(b * 10)) / 10;
}
export function fmtPt(d: number | null) {
  if (d == null) return "—";
  if (d === 0) return "±0.0ポイント";
  return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}ポイント`;
}

// 0〜100% の共通固定尺度（両地図・凡例・棒グラフで共有）
const STOPS: [number, [number, number, number]][] = [
  [0, [250, 244, 230]],
  [20, [247, 214, 160]],
  [40, [236, 156, 96]],
  [60, [196, 84, 76]],
  [80, [128, 36, 72]],
  [100, [56, 16, 52]],
];
export function rateColor(v: number | null, missing = "#6b6470"): string {
  if (v == null) return missing;
  const x = Math.max(0, Math.min(100, v));
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    const [x0, c0] = STOPS[i - 1];
    if (x <= x1) {
      const t = (x - x0) / (x1 - x0);
      const c = c0.map((a, k) => Math.round(a + (c1[k] - a) * t));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(56,16,52)";
}
export const GRADIENT_STOPS = STOPS.map(([x, c]) => ({ offset: x, color: `rgb(${c.join(",")})` }));
