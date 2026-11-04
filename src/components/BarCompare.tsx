import { useMemo, useState } from "react";
import { fmtRate, NATIONAL, rateColor, type Rec } from "../lib/data";

type SortKey = "code" | "cinemaRate" | "outsideCinemaRate";
type Props = { rows: Rec[]; nation: Rec | undefined; selected: string; onSelect: (code: string) => void };

// 都道府県ごとに2本の独立した棒（0〜100%の共通軸）。構成比ではない。
export function BarCompare({ rows, nation, selected, onSelect }: Props) {
  const [sort, setSort] = useState<SortKey>("code");
  const sorted = useMemo(() => {
    const prefs = rows.filter((r) => r.prefectureCode !== NATIONAL);
    if (sort === "code") return [...prefs].sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode));
    return [...prefs].sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1) || a.prefectureCode.localeCompare(b.prefectureCode));
  }, [rows, sort]);

  const nc = nation?.cinemaRate ?? null;
  const no = nation?.outsideCinemaRate ?? null;

  return (
    <section className="bars" aria-labelledby="bars-title">
      <div className="bars-head">
        <h2 id="bars-title">47都道府県を並べて見る</h2>
        <div className="seg seg-small" role="radiogroup" aria-label="並び順（率順は高い順）">
          {(
            [
              ["code", "コード順"],
              ["cinemaRate", "映画館の率順"],
              ["outsideCinemaRate", "映画館以外の率順"],
            ] as [SortKey, string][]
          ).map(([k, l]) => (
            <button key={k} role="radio" aria-checked={sort === k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <p className="bars-note">
        各県の2本の棒はそれぞれ独立した割合です（足して100%になるものではありません）。上の棒＝映画館、下の棒＝映画館以外。点線は全国値。行を押すと地図とカードの選択県が変わります。
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
      <ol className="bars-list">
        {sorted.map((r) => (
          <li key={r.prefectureCode}>
            <button
              className={`bar-row${r.prefectureCode === selected ? " is-selected" : ""}`}
              aria-pressed={r.prefectureCode === selected}
              aria-label={`${r.prefectureName}　映画館 ${fmtRate(r.cinemaRate)}、映画館以外 ${fmtRate(r.outsideCinemaRate)}`}
              onClick={() => onSelect(r.prefectureCode)}
            >
              <span className="bar-name">{r.prefectureName}</span>
              <span className="bar-track" aria-hidden="true">
                {nc != null && <i className="bar-nat" style={{ left: `${nc}%` }} />}
                {no != null && <i className="bar-nat" style={{ left: `${no}%` }} />}
                <span className="bar bar-cinema" style={{ width: `${r.cinemaRate ?? 0}%`, background: rateColor(r.cinemaRate) }}>
                  <em>{fmtRate(r.cinemaRate)}</em>
                </span>
                <span className="bar bar-outside" style={{ width: `${r.outsideCinemaRate ?? 0}%`, background: rateColor(r.outsideCinemaRate) }}>
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
