// 生成データの検証。失敗時は exit 1。結果は data/verification.md に書き出す。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const json = JSON.parse(read("public/data/cinema_2021.json"));
const manifest = JSON.parse(read("data/manifest.json"));
const topo = JSON.parse(read("public/data/japan_pref.topojson"));
const csvLines = read("data/processed/cinema_2021.csv").trim().split("\n");

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

const recs = json.records;
const SEXES = ["total", "male", "female"];
const PREFS = Array.from({ length: 47 }, (_, i) => String(i + 1).padStart(2, "0"));

// 1. 件数
check("CSV 全行数 = 432（48地域×3性別×3地区区分）", csvLines.length - 1 === 432, `${csvLines.length - 1}`);
check("配信JSON 件数 = 144（48地域×3性別、地区=総数）", recs.length === 144, `${recs.length}`);

// 2. 重複キー
const keys = new Set(recs.map((r) => `${r.prefectureCode}|${r.sex}`));
check("重複キーなし（地域×性別）", keys.size === recs.length);

// 3. 47県×3性別×2指標 = 282 数値、全国 6 数値
const prefVals = recs.filter((r) => r.prefectureCode !== "00").flatMap((r) => [r.cinemaRate, r.outsideCinemaRate]);
const natVals = recs.filter((r) => r.prefectureCode === "00").flatMap((r) => [r.cinemaRate, r.outsideCinemaRate]);
check("47都道府県の映画指標 282値がすべて数値", prefVals.length === 282 && prefVals.every((v) => typeof v === "number"), `${prefVals.filter((v) => typeof v === "number").length}/282`);
check("全国の映画指標 6値がすべて数値", natVals.length === 6 && natVals.every((v) => typeof v === "number"), `${natVals.filter((v) => typeof v === "number").length}/6`);

// 4. 値域
const all = [...prefVals, ...natVals];
check("値域 0〜100", all.every((v) => v >= 0 && v <= 100), `min=${Math.min(...all)} max=${Math.max(...all)}`);

// 5. 地域コード 00〜47 が各性別でそろう
for (const s of SEXES) {
  const codes = recs.filter((r) => r.sex === s).map((r) => r.prefectureCode).sort();
  check(`性別=${s}: コード 00〜47 がそろう`, codes.join() === ["00", ...PREFS].join());
}

// 6. 境界との一対一結合
const geoCodes = Object.values(topo.objects)[0].geometries.map((g) => String(g.properties.id).padStart(2, "0"));
const dataCodes = [...new Set(recs.map((r) => r.prefectureCode).filter((c) => c !== "00"))].sort();
check("境界ポリゴン 47件・コード重複なし", geoCodes.length === 47 && new Set(geoCodes).size === 47);
check("統計 01〜47 と境界 01〜47 が一対一で結合", [...geoCodes].sort().join() === dataCodes.join() && dataCodes.join() === PREFS.join());

// 7. 検算値
const get = (code, sex) => recs.find((r) => r.prefectureCode === code && r.sex === sex);
const expect = (label, r, c, o) =>
  check(`検算 ${label} = ${c}％／${o}％`, r && r.cinemaRate === c && r.outsideCinemaRate === o, r ? `${r.cinemaRate}／${r.outsideCinemaRate}` : "なし");
expect("全国・男女計", get("00", "total"), 29.8, 52.7);
expect("北海道・男女計", get("01", "total"), 23.3, 51.7);
expect("北海道・男性", get("01", "male"), 23.5, 53.4);
expect("北海道・女性", get("01", "female"), 23.2, 50.2);

// 人口集中地区別の北海道参考値（CSV）
const header = csvLines[0].split(",");
const rows = csvLines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
const hk = (d) => rows.find((r) => r.prefectureCode === "01" && r.sex === "total" && r.district === d);
check("検算 北海道・人口集中地区 = 24.6％／52.7％", hk("did")?.cinemaRate === "24.6" && hk("did")?.outsideCinemaRate === "52.7");
check("検算 北海道・人口集中地区以外 = 17.8％／47.4％", hk("non_did")?.cinemaRate === "17.8" && hk("non_did")?.outsideCinemaRate === "47.4");

// 人口集中地区別を含む全件の数値監査（参考）
const nonNumeric = rows.filter((r) => r.cinemaRate === "" || r.outsideCinemaRate === "");
check("CSV 全432行の映画指標が数値（人口集中地区別を含む）", nonNumeric.length === 0, nonNumeric.map((r) => `${r.prefectureCode}/${r.sex}/${r.district}: ${r.missingReason}`).join("; "));

// 8. 全国値は公表全国行（単純平均ではない）
const avg = (k) => recs.filter((r) => r.sex === "total" && r.prefectureCode !== "00").reduce((a, r) => a + r[k], 0) / 47;
check("全国値は全国行を使用（47県単純平均とは別値）", get("00", "total").cinemaRate !== Number(avg("cinemaRate").toFixed(1)), `47県単純平均=${avg("cinemaRate").toFixed(2)}`);

// 9. manifest のハッシュ一致
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");
check("原Excel のハッシュが manifest と一致", sha(manifest.sourceFile.path) === manifest.sourceFile.sha256);
for (const o of manifest.outputs) check(`${o.path} のハッシュが manifest と一致`, sha(o.path) === o.sha256);

// --- 出力 ---
const failed = results.filter((r) => !r.ok);
const md = [
  "# データ検証結果",
  "",
  `実行: \`npm run verify\`（scripts/verify-data.mjs）`,
  "",
  "| 結果 | 項目 | 詳細 |",
  "| --- | --- | --- |",
  ...results.map((r) => `| ${r.ok ? "OK" : "NG"} | ${r.name} | ${r.detail.replace(/\|/g, "\\|")} |`),
  "",
  `合計 ${results.length} 項目、失敗 ${failed.length} 項目`,
  "",
].join("\n");
fs.writeFileSync(path.join(ROOT, "data/verification.md"), md);
for (const r of results) console.log(`${r.ok ? "OK" : "NG"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
if (failed.length) {
  console.error(`\n${failed.length} 項目が失敗しました`);
  process.exit(1);
}
