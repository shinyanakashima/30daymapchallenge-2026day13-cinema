// 令和3年社会生活基本調査 表93-2（Excel）から映画鑑賞の行動者率を抽出し、
// 配信用JSON・正規化CSV・出典manifestを生成する。
//
//   node scripts/build-data.mjs [path/to/xlsx]
//
// 列位置は固定せず、見出し行の項目コード（04_／05_）と「推定人口」「サンプルサイズ」を照合して決める。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ExcelJS from "exceljs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = process.argv[2] ?? path.join(ROOT, "data/raw/r3_shakai_A_table93-2_000032223421.xlsx");
const OUT_JSON = path.join(ROOT, "public/data/cinema_2021.json");
const OUT_CSV = path.join(ROOT, "data/processed/cinema_2021.csv");
const OUT_MANIFEST = path.join(ROOT, "data/manifest.json");
const TOPO = path.join(ROOT, "public/data/japan_pref.topojson");

const SOURCE = {
  surveyName: "令和3年社会生活基本調査",
  publisher: "総務省統計局",
  questionnaire: "調査票A",
  section: "生活行動編（地域）／趣味・娯楽",
  tableNumber: "第93-2表",
  tableTitle: "男女,趣味・娯楽の種類別行動者率(10歳以上)－全国，都道府県",
  publishedDate: "2022-08-31",
  statInfId: "000032223421",
  dbStatsDataId: "0003456573",
  pageUrl: "https://www.e-stat.go.jp/stat-search/files?stat_infid=000032223421",
  fileUrl: "https://www.e-stat.go.jp/stat-search/file-download?statInfId=000032223421&fileKind=0",
  dbViewUrl: "https://www.e-stat.go.jp/dbview?sid=0003456573",
  retrievedAt: "2026-11-04",
  terms:
    "政府統計の総合窓口（e-Stat）利用規約に基づく。政府標準利用規約（第2.0版）準拠、CC BY 4.0 互換。出典を明記して利用・加工可。https://www.e-stat.go.jp/terms-of-use",
};

const PERIOD = {
  referenceDate: "2021-10-20",
  from: "2020-10-20",
  to: "2021-10-19",
  population: "10歳以上",
  definition:
    "行動者率＝属性の人口に占める、過去1年間に該当する活動をした人の割合（％）。両項目は排他的ではない（両方で鑑賞した人を含む）。",
};

const SEX = { "0_総数": "total", "1_男": "male", "2_女": "female" };
const DISTRICT = { "0_総数": "total", "1_人口集中地区": "did", "2_人口集中地区以外": "non_did" };

const text = (v) => {
  if (v == null) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((t) => t.text).join("");
  if (typeof v === "object" && "result" in v) return String(v.result);
  return String(v);
};

// 数値ならそのまま、記号等なら null と理由を返す（ゼロに置換しない）
function numeric(v) {
  if (typeof v === "number" && Number.isFinite(v)) return { value: v, note: null };
  if (v && typeof v === "object" && typeof v.result === "number") return { value: v.result, note: null };
  const s = text(v).trim();
  if (s !== "" && /^-?\d+(\.\d+)?$/.test(s)) return { value: Number(s), note: null };
  return { value: null, note: s === "" ? "空欄" : `原表記号「${s}」` };
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SRC);
const ws = wb.worksheets[0];

// --- 見出しの照合 ---
let headerRow = -1;
const col = {};
ws.eachRow((row, r) => {
  row.eachCell((c, ci) => {
    const t = text(c.value).trim();
    if (t === "04_映画館での映画鑑賞") { col.cinema = ci; headerRow = r; }
    if (t.startsWith("05_映画館以外での映画鑑賞")) col.outside = ci;
    if (t === "推定人口") col.population = ci;
    if (t === "サンプルサイズ") col.sample = ci;
    if (t === "男女") col.sex = ci;
    if (t === "地域区分") col.region = ci;
    if (t === "人口集中地区・人口集中地区以外") col.district = ci;
  });
});
for (const k of ["cinema", "outside", "population", "sample", "sex", "region", "district"]) {
  if (!col[k]) throw new Error(`見出し ${k} が見つかりません`);
}
const cinemaHeader = text(ws.getRow(headerRow).getCell(col.cinema).value);
const outsideHeader = text(ws.getRow(headerRow).getCell(col.outside).value);
const unitRow = ws.getRow(headerRow + 1);
if (text(unitRow.getCell(col.cinema).value) !== "％" || text(unitRow.getCell(col.outside).value) !== "％")
  throw new Error("映画指標の単位が％ではありません");
if (text(unitRow.getCell(col.population).value) !== "千人") throw new Error("推定人口の単位が千人ではありません");

// --- データ行 ---
const records = [];
let firstDataRow = null;
ws.eachRow((row, r) => {
  const sexRaw = text(row.getCell(col.sex).value).trim();
  if (!(sexRaw in SEX)) return;
  firstDataRow ??= r;
  const regionRaw = text(row.getCell(col.region).value).trim();
  const m = regionRaw.match(/^(\d{2})_(.+)$/);
  if (!m) throw new Error(`地域区分を解釈できません: row ${r} "${regionRaw}"`);
  const districtRaw = text(row.getCell(col.district).value).trim();
  if (!(districtRaw in DISTRICT)) throw new Error(`地区区分を解釈できません: row ${r} "${districtRaw}"`);
  const cinema = numeric(row.getCell(col.cinema).value);
  const outside = numeric(row.getCell(col.outside).value);
  const sample = numeric(row.getCell(col.sample).value);
  const pop = numeric(row.getCell(col.population).value);
  const notes = [
    cinema.note && `cinemaRate: ${cinema.note}`,
    outside.note && `outsideCinemaRate: ${outside.note}`,
    sample.note && `sampleSize: ${sample.note}`,
    pop.note && `estimatedPopulationThousands: ${pop.note}`,
  ].filter(Boolean);
  records.push({
    year: 2021,
    prefectureCode: m[1],
    prefectureName: m[2],
    sex: SEX[sexRaw],
    district: DISTRICT[districtRaw],
    cinemaRate: cinema.value,
    outsideCinemaRate: outside.value,
    sampleSize: sample.value,
    estimatedPopulationThousands: pop.value,
    missingReason: notes.length ? notes.join("; ") : null,
    sourceRow: r,
  });
});

// --- 境界データの結合確認（01〜47） ---
const topo = JSON.parse(fs.readFileSync(TOPO, "utf8"));
const geoms = Object.values(topo.objects)[0].geometries;
const geoCodes = geoms.map((g) => String(g.properties.id).padStart(2, "0")).sort();

// --- 出力 ---
fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
const csvCols = [
  "year", "prefectureCode", "prefectureName", "sex", "district", "cinemaRate",
  "outsideCinemaRate", "sampleSize", "estimatedPopulationThousands", "missingReason", "sourceRow",
];
const csv = [csvCols.join(",")]
  .concat(records.map((r) => csvCols.map((k) => (r[k] == null ? "" : String(r[k]).includes(",") ? `"${r[k]}"` : r[k])).join(",")))
  .join("\n") + "\n";
fs.writeFileSync(OUT_CSV, csv);

const json = {
  source: {
    survey: `${SOURCE.publisher}「${SOURCE.surveyName}」${SOURCE.questionnaire}`,
    table: `${SOURCE.tableNumber} ${SOURCE.tableTitle}`,
    url: SOURCE.pageUrl,
    retrievedAt: SOURCE.retrievedAt,
  },
  period: PERIOD,
  indicators: { cinemaRate: cinemaHeader, outsideCinemaRate: outsideHeader },
  // 配信用は主仕様で使う地区区分=総数のみ（人口集中地区別は CSV に保持）
  records: records
    .filter((r) => r.district === "total")
    .map(({ sourceRow, district, year, ...rest }) => rest),
};
fs.writeFileSync(OUT_JSON, JSON.stringify(json));

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const rel = (p) => path.relative(ROOT, p);
const manifest = {
  generatedBy: "scripts/build-data.mjs",
  source: SOURCE,
  period: PERIOD,
  sourceFile: { path: rel(SRC), sha256: sha(SRC), sheet: ws.name },
  columnMapping: {
    headerRow,
    unitRow: headerRow + 1,
    firstDataRow,
    sex: ws.getColumn(col.sex).letter,
    region: ws.getColumn(col.region).letter,
    district: ws.getColumn(col.district).letter,
    estimatedPopulationThousands: ws.getColumn(col.population).letter,
    cinemaRate: `${ws.getColumn(col.cinema).letter} (${cinemaHeader})`,
    outsideCinemaRate: `${ws.getColumn(col.outside).letter} (${outsideHeader})`,
    sampleSize: ws.getColumn(col.sample).letter,
  },
  codes: { sex: SEX, district: DISTRICT },
  recordCounts: {
    all: records.length,
    districtTotal: records.filter((r) => r.district === "total").length,
    missingValues: records.filter((r) => r.missingReason).length,
  },
  boundary: {
    path: rel(TOPO),
    sha256: sha(TOPO),
    origin:
      "dataofjapan/land japan.geojson（地球地図日本〔国土地理院〕のShapefileを変換）を mapshaper で簡素化し TopoJSON 化",
    originUrl: "https://github.com/dataofjapan/land",
    attribution: "地球地図日本（国土地理院） https://www.gsi.go.jp/kankyochiri/gm_jpn.html",
    terms:
      "配布元に準ずる。非営利目的は出典（地球地図日本）の明記。営利目的は出典明記に加え著作権者への利用報告。",
    featureCount: geoms.length,
    joinKey: "properties.id（都道府県コード 1〜47 を2桁化）",
    codes: geoCodes,
  },
  outputs: [OUT_JSON, OUT_CSV].map((p) => ({ path: rel(p), sha256: sha(p) })),
};
fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

console.log(
  `records=${records.length} (district=total: ${manifest.recordCounts.districtTotal}), missing=${manifest.recordCounts.missingValues}`,
);
console.log(`columns: cinema=${manifest.columnMapping.cinemaRate} outside=${manifest.columnMapping.outsideCinemaRate}`);
