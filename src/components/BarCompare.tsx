import { useEffect, useMemo, useRef, useState } from "react";
import { fmtRate, NATIONAL, IND_COLOR, type Rec } from "../lib/data";
import { useI18n } from "../lib/i18n";

type SortKey = "code" | "cinemaRate" | "outsideCinemaRate";
type Props = { rows: Rec[]; nation: Rec | undefined; selected: string; onSelect: (code: string) => void };

// 都道府県ごとに2本の独立した棒（0〜100%の共通軸）。構成比ではない。
export function BarCompare({ rows, nation, selected, onSelect }: Props) {
  const { t, prefName } = useI18n();
  const [sort, setSort] = useState<SortKey>("code");
  const sorted = useMemo(() => {
    const prefs = rows.filter((r) => r.prefectureCode !== NATIONAL);
    if (sort === "code") return [...prefs].sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode));
    return [...prefs].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1) || a.prefectureCode.localeCompare(b.prefectureCode));
  }, [rows, sort]);

  // 選択県が変わったら、リストが内部スクロールしている場合のみ該当行を見える位置へ（ページ自体は動かさない）
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const ol = listRef.current;
    if (!ol || ol.scrollHeight <= ol.clientHeight + 1) return;
    const li = ol.querySelector<HTMLElement>(".is-selected")?.parentElement;
    if (!li) return;
    const top = li.offsetTop - ol.offsetTop;
    if (top < ol.scrollTop || top + li.offsetHeight > ol.scrollTop + ol.clientHeight)
      ol.scrollTo({ top: top - ol.clientHeight / 2 + li.offsetHeight / 2, behavior: "smooth" });
  }, [selected, sort]);

  const nc = nation?.cinemaRate ?? null;
  const no = nation?.outsideCinemaRate ?? null;

  return (
    <section className="bars" aria-labelledby="bars-title">
      <div className="bars-head">
        <h2 id="bars-title">{t.barsTitle}</h2>
        <div className="seg seg-small" role="radiogroup" aria-label={t.sortAria}>
          {(["code", "cinemaRate", "outsideCinemaRate"] as SortKey[]).map((k) => [k, t.sort[k]] as const).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={sort === k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="bars-note">
        {t.barsNote}
      </p>
      <div className="bars-axis" aria-hidden="true">
        <span />
        <div className="bars-axis-scale">
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <span key={t} style={{ left: `${t}%` }}>
              {t}%
            </span>
          ))}
        </div>
      </div>
      <ol className="bars-list" ref={listRef}>
        {sorted.map((r) => (
          <li key={r.prefectureCode}>
            <button
              className={`bar-row${r.prefectureCode === selected ? " is-selected" : ""}`}
              aria-pressed={r.prefectureCode === selected}
              aria-label={`${prefName(r)}: ${t.ind.cinemaRate} ${fmtRate(r.cinemaRate)}, ${t.ind.outsideCinemaRate} ${fmtRate(r.outsideCinemaRate)}`}
              onClick={() => onSelect(r.prefectureCode)}
            >
              <span className="bar-name">{prefName(r)}</span>
              <span className="bar-track" aria-hidden="true">
                {nc != null && <i className="bar-nat" style={{ left: `${nc}%` }} />}
                {no != null && <i className="bar-nat" style={{ left: `${no}%` }} />}
                <span className="bar bar-cinema" style={{ width: `${r.cinemaRate ?? 0}%`, background: IND_COLOR.cinemaRate }}>
                  <em>{fmtRate(r.cinemaRate)}</em>
                </span>
                <span className="bar bar-outside" style={{ width: `${r.outsideCinemaRate ?? 0}%`, background: IND_COLOR.outsideCinemaRate }}>
                  <em>{fmtRate(r.outsideCinemaRate)}</em>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
