import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChoroplethMap } from "./components/ChoroplethMap";
import { Legend } from "./components/Legend";
import { TicketCard } from "./components/TicketCard";
import { BarCompare } from "./components/BarCompare";
import { DataTable } from "./components/DataTable";
import { Modal } from "./components/Modal";
import { HoverCard, type HoverState } from "./components/HoverCard";
import { indexBy, loadDataset, LoadError, NATIONAL, type Dataset, type Indicator, type Sex } from "./lib/data";
import { I18nContext, initialLang, makeI18n, useI18n, type Lang } from "./lib/i18n";
import { AboutEn } from "./components/AboutEn";
import { buildGeometry, type MapGeometry } from "./lib/geo";
import { PillarLegend } from "./components/PillarLegend";

// 立体表示（three.js）は別チャンクで読み込む
const CinemaStage = lazy(() => import("./components/CinemaStage").then((m) => ({ default: m.CinemaStage })));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const MAP_W = 520;

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [geo, setGeo] = useState<MapGeometry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sex, setSex] = useState<Sex>("total");
  const [selected, setSelected] = useState("01");
  const [hover, setHover] = useState<HoverState>(null);
  const [mobileInd, setMobileInd] = useState<Indicator>("cinemaRate");
  const [zoomed, setZoomed] = useState(false);
  const [webgl, setWebgl] = useState(hasWebGL);
  const [mode, setMode] = useState<"3d" | "2d">(() => (hasWebGL() ? "3d" : "2d"));
  const view = webgl ? mode : "2d";
  // どこから選んでも、選択県へズームイン（斜め視点）する
  const selectPref = (code: string) => {
    setSelected(code);
    setZoomed(true);
  };
  const [dialog, setDialog] = useState<"about" | "table" | null>(null);
  const [lang, setLang] = useState<Lang>(initialLang);
  const i18n = useMemo(() => makeI18n(lang), [lang]);
  const { t } = i18n;
  const [loadErr, setLoadErr] = useState<LoadError | null>(null);

  // 言語：html の lang・タイトル・URL（共有用）・前回の選択を更新
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t.docTitle;
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("lang", lang);
      window.history.replaceState(null, "", u);
      window.localStorage.setItem("lang", lang);
    } catch {
      /* 保存できない環境では何もしない */
    }
  }, [lang, t]);

  useEffect(() => {
    Promise.all([
      loadDataset(),
      fetch(`${import.meta.env.BASE_URL}data/japan_pref.topojson`).then((r) => {
        if (!r.ok) throw new LoadError("map", r.status);
        return r.json();
      }),
    ])
      .then(([d, t]) => {
        setData(d);
        setGeo(buildGeometry(t, MAP_W));
      })
      .catch((e: Error) => {
        if (e instanceof LoadError) setLoadErr(e);
        setError(e.message || "error");
      });
  }, []);

  const rows = useMemo(() => (data ? data.records.filter((r) => r.sex === sex) : []), [data, sex]);
  const byCode = useMemo(() => new Map(rows.map((r) => [r.prefectureCode, r])), [rows]);
  const idx = useMemo(() => (data ? indexBy(data.records) : new Map()), [data]);
  const nation = idx.get(`${NATIONAL}|${sex}`);
  const pref = byCode.get(selected);
  const prefList = rows.filter((r) => r.prefectureCode !== NATIONAL).sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode));

  const errText = loadErr ? (loadErr.kind === "stats" ? t.errStats(loadErr.status) : t.errMap(loadErr.status)) : t.errGeneric;

  return (
    <I18nContext.Provider value={i18n}>
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <p className="kicker">#30DayMapChallenge 2026 · Day 5 Senses: Sight</p>
          <h1>{t.title}</h1>
        </div>
        <p className="lede">
          {t.question}
          <strong>{t.lede}</strong>
        </p>
        {data && geo && (
          <div className="controls">
            <div className="seg seg-lang" role="radiogroup" aria-label={t.langLabel}>
              {(["en", "ja"] as Lang[]).map((l) => (
                <button key={l} role="radio" aria-checked={lang === l} className={lang === l ? "on" : ""} onClick={() => setLang(l)} lang={l}>
                  {l === "en" ? "EN" : "日本語"}
                </button>
              ))}
            </div>
            <div className="seg" role="radiogroup" aria-label={t.sexLabel}>
              {(["total", "male", "female"] as Sex[]).map((s) => (
                <button key={s} role="radio" aria-checked={sex === s} className={sex === s ? "on" : ""} onClick={() => setSex(s)}>
                  {t.sex[s]}
                </button>
              ))}
            </div>
            <div className="seg" role="radiogroup" aria-label={t.viewLabel}>
              <button role="radio" aria-checked={view === "3d"} className={view === "3d" ? "on" : ""} onClick={() => setMode("3d")} disabled={!webgl} title={webgl ? undefined : t.no3d}>
                {t.view3d}
              </button>
              <button role="radio" aria-checked={view === "2d"} className={view === "2d" ? "on" : ""} onClick={() => setMode("2d")}>
                {t.view2d}
              </button>
            </div>
            {view === "2d" && (
            <div className="seg seg-mobile" role="radiogroup" aria-label={t.mobileMapLabel}>
              {(["cinemaRate", "outsideCinemaRate"] as Indicator[]).map((k) => (
                <button key={k} role="radio" aria-checked={mobileInd === k} className={mobileInd === k ? "on" : ""} onClick={() => setMobileInd(k)}>
                  {t.ind[k]}
                </button>
              ))}
            </div>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="error" role="alert">
          {errText}
          {t.reload}
        </div>
      )}
      {!error && (!data || !geo) && (
        <p className="loading" role="status">
          {t.loading}
        </p>
      )}

      {data && geo && (
        <main className="stage">
          {view === "3d" ? (
            <div className="stage3d-wrap">
              <MapDock
                prefList={prefList}
                selected={selected}
                onSelect={selectPref}
                zoomed={zoomed}
                onToggle={() => setZoomed((z) => !z)}
              />
              <Suspense fallback={<p className="loading">{t.loading3d}</p>}>
                <CinemaStage
                  geo={geo}
                  byCode={byCode}
                  nation={nation}
                  selected={selected}
                  onSelect={selectPref}
                  zoomed={zoomed}
                  onReset={() => setZoomed(false)}
                  onHover={setHover}
                  onFail={() => setWebgl(false)}
                />
              </Suspense>
            </div>
          ) : (
          <div className={`screens${zoomed ? " is-zoomed" : ""}`}>
            <MapDock
              prefList={prefList}
              selected={selected}
              onSelect={selectPref}
              zoomed={zoomed}
              onToggle={() => setZoomed((z) => !z)}
            />
            {(["cinemaRate", "outsideCinemaRate"] as Indicator[]).map((k) => (
              <figure key={k} className={`screen${mobileInd === k ? " mobile-on" : ""}`}>
                <figcaption>
                  <span className="screen-title">{t.ind[k]}</span>
                  <span className="screen-sub">{t.indSub[k]}</span>
                  <span className="screen-nat">{t.national} {nation?.[k]?.toFixed(1)}%</span>
                </figcaption>
                <div className="map-box">
                  <ChoroplethMap
                    geo={geo}
                    indicator={k}
                    byCode={byCode}
                    selected={selected}
                    onSelect={selectPref}
                    zoomed={zoomed}
                    onReset={() => setZoomed(false)}
                    hovered={hover?.code ?? null}
                    onHover={setHover}
                  />
                </div>
              </figure>
            ))}
          </div>
          )}

          <aside className="side">
            <TicketCard pref={pref} nation={nation} sex={sex} />
            {view === "3d" ? (
              <PillarLegend nation={nation} />
            ) : (
              <Legend
                markers={[
                  { label: t.ind.cinemaRate, value: nation?.cinemaRate ?? null },
                  { label: t.ind.outsideCinemaRate, value: nation?.outsideCinemaRate ?? null },
                ]}
              />
            )}
            <BarCompare rows={rows} nation={nation} selected={selected} onSelect={selectPref} />
          </aside>
          <HoverCard hover={hover} byCode={byCode} nation={nation} />
        </main>
      )}

      <footer className="foot">
        <p className="foot-source">
          {t.footSource}
        </p>
        <div className="foot-actions">
          <button onClick={() => setDialog("about")}>{t.about}</button>
          <button onClick={() => setDialog("table")} disabled={!data}>
            {t.table}
          </button>
          <a href="https://github.com/shinyanakashima/30daymapchallenge-2026day5-senses-cinema" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>

      <Modal open={dialog === "about"} title={t.aboutTitle} onClose={() => setDialog(null)}>
        {lang === "en" ? <AboutEn data={data} /> : (
        <div className="about">
          <p>
            総務省『2021年社会生活基本調査』をもとに、10歳以上の人が過去1年間（2020年10月20日〜2021年10月19日）に映画を鑑賞した割合を表示しています。映画館と映画館以外の両方で見た人も含まれます。コロナ禍を含む期間の結果であり、現在の視聴状況や個人の好みを直接示すものではありません。
          </p>
          <ul>
            <li>「映画館以外」は調査項目「映画館以外での映画鑑賞（テレビ・DVD・パソコンなど）」です。動画配信サービスや一般の動画視聴と同じ意味ではありません。</li>
            <li>2つの割合は排他的ではないため、足し合わせたり構成比として読んだりできません。両方で見た人・どちらも見ない人の割合はこの表からは分かりません。</li>
            <li>年齢構成などを調整した値ではありません。全国値との差は表示値（小数1桁）同士の差で、統計的に有意な差かどうかは示していません。地域差の原因（好み、映画館までの距離、所得など）はこのデータからは判断できません。</li>
            <li>全国値は公表された全国の値で、47都道府県の単純平均ではありません。</li>
            <li>立体表示では、各県に「映画館」（金色）と「映画館以外」（青色）の2本の柱を立て、高さを行動者率（0〜100%、2本とも同じ尺度）で表しています。柱を囲む輪は全国値の高さです。柱は県の位置を示す目印で、県内の地点を表すものではありません。斜めから見ているため、手前と奥では同じ高さでも見かけの長さが変わります。正確な値はカード・棒グラフ・数値表で確認できます。</li>
            <li>地図はメルカトル図法・全県同一縮尺。沖縄県は位置を移動して別枠に表示し、小笠原諸島など北緯30度以南の東京都の島は省略しています。「2面で比べる」では、0〜100%の共通尺度で塗り分けた2枚の地図を並べて表示します。</li>
          </ul>
          <dl className="source">
            <dt>出典</dt>
            <dd>
              総務省統計局「令和3年社会生活基本調査」調査票A　生活行動編（地域）
              <a href={data?.source.url} target="_blank" rel="noreferrer">
                第93-2表 男女,趣味・娯楽の種類別行動者率(10歳以上)－全国，都道府県
              </a>
              （e-Stat、2022年8月31日公表、{data?.source.retrievedAt}取得）を加工して作成
            </dd>
            <dt>地図</dt>
            <dd>
              地球地図日本（国土地理院）を変換した{" "}
              <a href="https://github.com/dataofjapan/land" target="_blank" rel="noreferrer">
                dataofjapan/land
              </a>{" "}
              を簡素化して使用
            </dd>
          </dl>
        </div>
        )}
      </Modal>
      <Modal open={dialog === "table"} title={t.tableTitle(t.sex[sex])} onClose={() => setDialog(null)}>
        {data && <DataTable rows={rows} nation={nation} sex={sex} />}
      </Modal>
    </div>
    </I18nContext.Provider>
  );
}

// 地図の上に重ねる操作パネル：都道府県の選択（前後送り付き）と全国表示への切替
function MapDock({
  prefList,
  selected,
  onSelect,
  zoomed,
  onToggle,
}: {
  prefList: { prefectureCode: string; prefectureName: string }[];
  selected: string;
  onSelect: (code: string) => void;
  zoomed: boolean;
  onToggle: () => void;
}) {
  const { t, prefName } = useI18n();
  const i = prefList.findIndex((r) => r.prefectureCode === selected);
  const step = (d: number) => onSelect(prefList[(i + d + prefList.length) % prefList.length].prefectureCode);
  return (
    <div className="map-dock">
      <div className="pref-picker">
        <button onClick={() => step(-1)} aria-label={t.prevPref}>
          ‹
        </button>
        <label>
          <span className="sr-only">{t.prefecture}</span>
          <select value={selected} onChange={(e) => onSelect(e.target.value)}>
            {prefList.map((r) => (
              <option key={r.prefectureCode} value={r.prefectureCode}>
                {r.prefectureCode} {prefName(r)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => step(1)} aria-label={t.nextPref}>
          ›
        </button>
      </div>
      <button className="dock-zoom" onClick={onToggle} aria-pressed={zoomed}>
        {zoomed ? t.zoomOut : t.zoomIn}
      </button>
    </div>
  );
}
