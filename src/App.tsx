import { useEffect, useMemo, useState } from "react";
import { ChoroplethMap } from "./components/ChoroplethMap";
import { Legend } from "./components/Legend";
import { TicketCard } from "./components/TicketCard";
import { BarCompare } from "./components/BarCompare";
import { DataTable } from "./components/DataTable";
import { IND_LABEL, IND_SUB, indexBy, loadDataset, NATIONAL, SEX_LABEL, type Dataset, type Indicator, type Sex } from "./lib/data";
import { buildGeometry, type MapGeometry } from "./lib/geo";

const MAP_W = 520;
const PERIOD_LABEL = "2021年調査　過去1年間（2020年10月20日〜2021年10月19日）";

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [geo, setGeo] = useState<MapGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex>("total");
  const [selected, setSelected] = useState("01");
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileInd, setMobileInd] = useState<Indicator>("cinemaRate");

  useEffect(() => {
    Promise.all([
      loadDataset(),
      fetch(`${import.meta.env.BASE_URL}data/japan_pref.topojson`).then((r) => {
        if (!r.ok) throw new Error(`地図データを読み込めませんでした（HTTP ${r.status}）`);
        return r.json();
      }),
    ])
      .then(([d, t]) => {
        setData(d);
        setGeo(buildGeometry(t, MAP_W));
      })
      .catch((e: Error) => setError(e.message || "データの読み込みに失敗しました"));
  }, []);

  const rows = useMemo(() => (data ? data.records.filter((r) => r.sex === sex) : []), [data, sex]);
  const byCode = useMemo(() => new Map(rows.map((r) => [r.prefectureCode, r])), [rows]);
  const idx = useMemo(() => (data ? indexBy(data.records) : new Map()), [data]);
  const nation = idx.get(`${NATIONAL}|${sex}`);
  const pref = byCode.get(selected);
  const prefList = rows.filter((r) => r.prefectureCode !== NATIONAL).sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode));

  return (
    <div className="app">
      <header className="masthead">
        <p className="kicker">#30DayMapChallenge 2026 · Day 5 Senses: Sight</p>
        <h1>映画を見る、日本を見る。</h1>
        <p className="lede">
          映画を見る場所は、地域でどう違う？　<strong>過去1年間に映画を見た人の割合。両方で見た人も含みます。</strong>
        </p>
      </header>

      {error && (
        <div className="error" role="alert">
          {error}。ページを再読み込みしてください。
        </div>
      )}
      {!error && (!data || !geo) && (
        <p className="loading" role="status">
          読み込み中…
        </p>
      )}

      {data && geo && (
        <main>
          <div className="controls">
            <div className="seg" role="radiogroup" aria-label="性別">
              {(["total", "male", "female"] as Sex[]).map((s) => (
                <button key={s} role="radio" aria-checked={sex === s} className={sex === s ? "on" : ""} onClick={() => setSex(s)}>
                  {SEX_LABEL[s]}
                </button>
              ))}
            </div>
            <label className="pref-select">
              <span>都道府県</span>
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {prefList.map((r) => (
                  <option key={r.prefectureCode} value={r.prefectureCode}>
                    {r.prefectureCode} {r.prefectureName}
                  </option>
                ))}
              </select>
            </label>
            <div className="seg seg-mobile" role="radiogroup" aria-label="表示する地図（スマートフォン）">
              {(["cinemaRate", "outsideCinemaRate"] as Indicator[]).map((k) => (
                <button key={k} role="radio" aria-checked={mobileInd === k} className={mobileInd === k ? "on" : ""} onClick={() => setMobileInd(k)}>
                  {IND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="screens">
            {(["cinemaRate", "outsideCinemaRate"] as Indicator[]).map((k) => (
              <figure key={k} className={`screen${mobileInd === k ? " mobile-on" : ""}`}>
                <figcaption>
                  <span className="screen-title">{IND_LABEL[k]}</span>
                  <span className="screen-sub">{IND_SUB[k]}</span>
                  <span className="screen-nat">全国 {nation?.[k]?.toFixed(1)}%</span>
                </figcaption>
                <ChoroplethMap
                  geo={geo}
                  indicator={k}
                  byCode={byCode}
                  selected={selected}
                  onSelect={setSelected}
                  hovered={hovered}
                  onHover={setHovered}
                />
              </figure>
            ))}
          </div>

          <Legend
            markers={[
              { label: "映画館", value: nation?.cinemaRate ?? null },
              { label: "映画館以外", value: nation?.outsideCinemaRate ?? null },
            ]}
          />

          <TicketCard pref={pref} nation={nation} sex={sex} period={PERIOD_LABEL} />

          <BarCompare rows={rows} nation={nation} selected={selected} onSelect={setSelected} />

          <DataTable rows={rows} nation={nation} sex={sex} />

          <section className="about" aria-labelledby="about-title">
            <h2 id="about-title">このデータについて</h2>
            <p>
              総務省『2021年社会生活基本調査』をもとに、10歳以上の人が過去1年間（2020年10月20日〜2021年10月19日）に映画を鑑賞した割合を表示しています。映画館と映画館以外の両方で見た人も含まれます。コロナ禍を含む期間の結果であり、現在の視聴状況や個人の好みを直接示すものではありません。
            </p>
            <ul>
              <li>「映画館以外」は調査項目「映画館以外での映画鑑賞（テレビ・DVD・パソコンなど）」です。動画配信サービスや一般の動画視聴と同じ意味ではありません。</li>
              <li>2つの割合は排他的ではないため、足し合わせたり構成比として読んだりできません。両方で見た人・どちらも見ない人の割合はこの表からは分かりません。</li>
              <li>年齢構成などを調整した値ではありません。全国値との差は表示値（小数1桁）同士の差で、統計的に有意な差かどうかは示していません。地域差の原因（好み、映画館までの距離、所得など）はこのデータからは判断できません。</li>
              <li>全国値は公表された全国の値で、47都道府県の単純平均ではありません。</li>
            </ul>
            <dl className="source">
              <dt>出典</dt>
              <dd>
                総務省統計局「令和3年社会生活基本調査」調査票A　生活行動編（地域）
                <a href={data.source.url} target="_blank" rel="noreferrer">
                  第93-2表 男女,趣味・娯楽の種類別行動者率(10歳以上)－全国，都道府県
                </a>
                （e-Stat、2022年8月31日公表、{data.source.retrievedAt}取得）を加工して作成
              </dd>
              <dt>地図</dt>
              <dd>
                地球地図日本（国土地理院）を変換した{" "}
                <a href="https://github.com/dataofjapan/land" target="_blank" rel="noreferrer">
                  dataofjapan/land
                </a>{" "}
                を簡素化して使用。沖縄県は位置を移動して別枠に表示し、小笠原諸島など北緯30度以南の東京都の島は省略しています。
              </dd>
            </dl>
          </section>
        </main>
      )}

      <footer className="foot">
        <p>
          ソースコードとデータ生成手順：
          <a href="https://github.com/shinyanakashima/30daymapchallenge-2026day5-senses-cinema" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
