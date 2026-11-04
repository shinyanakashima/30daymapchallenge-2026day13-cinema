import { createContext, useContext } from "react";
import type { Indicator, Rec, Sex } from "./data";

export type Lang = "ja" | "en";

// 都道府県の英語表記（コード 01〜47）
const PREF_EN: Record<string, string> = {
  "00": "Japan", "01": "Hokkaido", "02": "Aomori", "03": "Iwate", "04": "Miyagi", "05": "Akita", "06": "Yamagata",
  "07": "Fukushima", "08": "Ibaraki", "09": "Tochigi", "10": "Gunma", "11": "Saitama", "12": "Chiba", "13": "Tokyo",
  "14": "Kanagawa", "15": "Niigata", "16": "Toyama", "17": "Ishikawa", "18": "Fukui", "19": "Yamanashi", "20": "Nagano",
  "21": "Gifu", "22": "Shizuoka", "23": "Aichi", "24": "Mie", "25": "Shiga", "26": "Kyoto", "27": "Osaka", "28": "Hyogo",
  "29": "Nara", "30": "Wakayama", "31": "Tottori", "32": "Shimane", "33": "Okayama", "34": "Hiroshima", "35": "Yamaguchi",
  "36": "Tokushima", "37": "Kagawa", "38": "Ehime", "39": "Kochi", "40": "Fukuoka", "41": "Saga", "42": "Nagasaki",
  "43": "Kumamoto", "44": "Oita", "45": "Miyazaki", "46": "Kagoshima", "47": "Okinawa",
};

const ja = {
  docTitle: "映画を見る、日本を見る。",
  title: "映画を見る、日本を見る。",
  question: "映画を見る場所は、地域でどう違う？",
  lede: "過去1年間に映画を見た人の割合。両方で見た人も含みます。",
  langLabel: "言語",
  sexLabel: "性別",
  sex: { total: "男女計", male: "男性", female: "女性" } as Record<Sex, string>,
  viewLabel: "表示方法",
  view3d: "立体",
  view2d: "2面で比べる",
  no3d: "この環境では立体表示を使えません",
  mobileMapLabel: "表示する地図（スマートフォン）",
  ind: { cinemaRate: "映画館", outsideCinemaRate: "映画館以外" } as Record<Indicator, string>,
  indSub: {
    cinemaRate: "映画館での映画鑑賞",
    outsideCinemaRate: "映画館以外での映画鑑賞（テレビ・DVD・パソコンなど）",
  } as Record<Indicator, string>,
  national: "全国",
  nationalRow: "全国",
  pt: "ポイント",
  loading: "読み込み中…",
  loading3d: "立体地図を準備中…",
  reload: "。ページを再読み込みしてください。",
  errStats: (s: number) => `統計データを読み込めませんでした（HTTP ${s}）`,
  errMap: (s: number) => `地図データを読み込めませんでした（HTTP ${s}）`,
  errGeneric: "データの読み込みに失敗しました",
  prevPref: "前の都道府県",
  nextPref: "次の都道府県",
  prefecture: "都道府県",
  zoomOut: "全国を見る",
  zoomIn: "選択県に寄る",
  ticketAria: "選択中の都道府県",
  period: "2021年調査　過去1年間（2020年10月20日〜2021年10月19日）",
  missing: "欠損：",
  vsNational: (n: string) => `全国 ${n} との差`,
  hoverVs: "全国比",
  hoverFoot: "軸 0〜100%　縦線＝全国　クリックで選択",
  legendAria: "凡例",
  pillarCaption: "凡例　柱の高さ＝行動者率（0〜100%、2本とも同じ尺度）",
  ringNote: "柱を囲む輪＝全国値の高さ（選択県）",
  gradAria: "凡例：行動者率 0〜100% の共通尺度（両地図共通）",
  gradCaption: "行動者率（%）　両地図共通・0〜100%の固定尺度",
  gradNote: "縦線＝全国値：",
  barsTitle: "47都道府県",
  sortAria: "並び順（率順は高い順）",
  sort: { code: "コード順", cinemaRate: "映画館の率順", outsideCinemaRate: "映画館以外の率順" },
  barsNote: "上＝映画館、下＝映画館以外。2本はそれぞれ独立した割合で、足して100%にはなりません。点線は全国値。",
  tableCaption: (sex: string) => `都道府県別 映画鑑賞の行動者率（${sex}、%）と全国値との差（ポイント）`,
  th: { code: "コード", pref: "都道府県", vs: "全国との差", sample: "サンプルサイズ" },
  tableNote: "サンプルサイズは調査の回答者数で、映画を見た人の数ではありません。",
  close: "閉じる",
  stageRole: "立体地図",
  stageNote: "柱の高さ＝行動者率（0〜100%、2本とも同じ尺度）　輪＝全国値　沖縄県は左上の枠内に移動して表示",
  stageAria: (name: string, c: string, o: string) =>
    `都道府県ごとに、映画館（金色）と映画館以外（青色）の行動者率を柱の高さで示した立体地図。矢印キーで都道府県を選択、Escで全国表示。選択中：${name} 映画館 ${c}、映画館以外 ${o}`,
  mapRole: "地図",
  mapAria: (ind: string, name: string, v: string) =>
    `${ind}の都道府県別行動者率の地図。矢印キーで都道府県を選択、Escで全国表示。選択中：${name} ${v}`,
  okinawaInset: "沖縄県（位置を移動）",
  footSource: "出典：総務省統計局「令和3年社会生活基本調査」第93-2表を加工　地図：地球地図日本（国土地理院）",
  about: "データについて",
  aboutTitle: "このデータについて",
  table: "数値表",
  tableTitle: (sex: string) => `数値表（${sex}）`,
};

export type Dict = typeof ja;

const en: Dict = {
  docTitle: "Watching Movies, Seeing Japan",
  title: "Watching Movies, Seeing Japan",
  question: "Where do people watch movies, and how does it vary across Japan?",
  lede: "Share of people who watched a movie in the past year. People who did both are counted in both.",
  langLabel: "Language",
  sexLabel: "Sex",
  sex: { total: "Total", male: "Male", female: "Female" },
  viewLabel: "View",
  view3d: "3D",
  view2d: "Side by side",
  no3d: "3D view is not available in this browser",
  mobileMapLabel: "Map to show (mobile)",
  ind: { cinemaRate: "At cinemas", outsideCinemaRate: "Outside cinemas" },
  indSub: {
    cinemaRate: "Watching movies at a cinema",
    outsideCinemaRate: "Watching movies outside cinemas (TV, DVD, PC, etc.)",
  },
  national: "Japan",
  nationalRow: "Japan (national)",
  pt: " pts",
  loading: "Loading…",
  loading3d: "Preparing the 3D map…",
  reload: ". Please reload the page.",
  errStats: (s) => `Could not load the statistics (HTTP ${s})`,
  errMap: (s) => `Could not load the map data (HTTP ${s})`,
  errGeneric: "Failed to load data",
  prevPref: "Previous prefecture",
  nextPref: "Next prefecture",
  prefecture: "Prefecture",
  zoomOut: "View all of Japan",
  zoomIn: "Zoom to selection",
  ticketAria: "Selected prefecture",
  period: "2021 survey · Past 12 months (Oct 20, 2020 – Oct 19, 2021)",
  missing: "Missing: ",
  vsNational: (n) => `vs. national ${n}`,
  hoverVs: "vs. national",
  hoverFoot: "Axis 0–100% · line = national · click to select",
  legendAria: "Legend",
  pillarCaption: "Pillar height = participation rate (0–100%, same scale for both)",
  ringNote: "Ring around a pillar = national level (selected prefecture)",
  gradAria: "Legend: participation rate on a shared 0–100% scale (both maps)",
  gradCaption: "Participation rate (%) · same fixed 0–100% scale on both maps",
  gradNote: "Lines = national: ",
  barsTitle: "47 prefectures",
  sortAria: "Sort order (rates: high to low)",
  sort: { code: "By code", cinemaRate: "At cinemas", outsideCinemaRate: "Outside cinemas" },
  barsNote: "Top = at cinemas, bottom = outside cinemas. Each bar is a separate rate; they do not add up to 100%. Dotted lines = national.",
  tableCaption: (sex) => `Participation rate in movie watching by prefecture (${sex}, %) and difference from the national rate (percentage points)`,
  th: { code: "Code", pref: "Prefecture", vs: "vs. national", sample: "Sample size" },
  tableNote: "Sample size is the number of survey respondents, not the number of people who watched movies.",
  close: "Close",
  stageRole: "3D map",
  stageNote: "Pillar height = participation rate (0–100%, same scale for both) · Ring = national level · Okinawa is shown relocated in the upper-left box",
  stageAria: (name, c, o) =>
    `3D map with two pillars per prefecture showing the participation rate at cinemas (gold) and outside cinemas (blue). Use arrow keys to select a prefecture and Esc to view all of Japan. Selected: ${name}, at cinemas ${c}, outside cinemas ${o}`,
  mapRole: "map",
  mapAria: (ind, name, v) =>
    `Map of participation rate by prefecture: ${ind}. Use arrow keys to select a prefecture and Esc to view all of Japan. Selected: ${name} ${v}`,
  okinawaInset: "Okinawa (relocated)",
  footSource: "Source: Statistics Bureau of Japan, 2021 Survey on Time Use and Leisure Activities, Table 93-2 (processed) · Map: Global Map Japan (GSI)",
  about: "About the data",
  aboutTitle: "About the data",
  table: "Data table",
  tableTitle: (sex) => `Data table (${sex})`,
};

export const DICT: Record<Lang, Dict> = { ja, en };

export type I18n = {
  lang: Lang;
  t: Dict;
  prefName: (r: Pick<Rec, "prefectureCode" | "prefectureName"> | undefined) => string;
  fmtPt: (d: number | null) => string;
  num: (n: number | null | undefined) => string;
};

export function makeI18n(lang: Lang): I18n {
  const t = DICT[lang];
  return {
    lang,
    t,
    prefName: (r) => (!r ? "—" : lang === "ja" ? r.prefectureName : PREF_EN[r.prefectureCode] ?? r.prefectureName),
    fmtPt: (d) => {
      if (d == null) return "—";
      if (d === 0) return `±0.0${t.pt}`;
      return `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}${t.pt}`;
    },
    num: (n) => (n == null ? "—" : n.toLocaleString(lang === "ja" ? "ja-JP" : "en-US")),
  };
}

export const I18nContext = createContext<I18n>(makeI18n("ja"));
export const useI18n = () => useContext(I18nContext);

// URL の ?lang= → 前回の選択 → ブラウザの言語 の順で決める
export function initialLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "ja" || q === "en") return q;
    const saved = window.localStorage.getItem("lang");
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    /* storage 不可の環境ではブラウザ言語で決める */
  }
  return navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}
