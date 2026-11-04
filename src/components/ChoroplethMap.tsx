import type { KeyboardEvent } from "react";
import type { MapGeometry } from "../lib/geo";
import { fmtRate, IND_LABEL, rateColor, type Indicator, type Rec } from "../lib/data";

type Props = {
  geo: MapGeometry;
  indicator: Indicator;
  byCode: Map<string, Rec>;
  selected: string;
  onSelect: (code: string) => void;
  hovered: string | null;
  onHover: (code: string | null) => void;
};

export function ChoroplethMap({ geo, indicator, byCode, selected, onSelect, hovered, onHover }: Props) {
  const sel = geo.shapes.find((s) => s.code === selected);
  const label = IND_LABEL[indicator];

  // 地図は1つのタブ停止。←→↑↓ で都道府県コード順に選択を移動する
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const n = Number(selected);
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = n >= 47 ? 1 : n + 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = n <= 1 ? 47 : n - 1;
    if (e.key === "Home") next = 1;
    if (e.key === "End") next = 47;
    if (next != null) {
      e.preventDefault();
      onSelect(String(next).padStart(2, "0"));
    }
  };

  const ib = geo.insetBox;
  return (
    <svg
      className="map-svg"
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      role="application"
      aria-roledescription="地図"
      aria-label={`${label}の都道府県別行動者率の地図。矢印キーで都道府県を選択。選択中：${byCode.get(selected)?.prefectureName ?? ""} ${fmtRate(byCode.get(selected)?.[indicator] ?? null)}`}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseLeave={() => onHover(null)}
    >
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#ddd8cc" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#9a948a" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x={ib.x} y={ib.y} width={ib.w} height={ib.h} className="inset-box" />
      <text x={ib.x + 4} y={ib.y + ib.h + 12} className="inset-label">
        沖縄県（位置を移動）
      </text>
      <g>
        {geo.shapes.map((s) => {
          const r = byCode.get(s.code);
          const v = r ? r[indicator] : null;
          return (
            <path
              key={s.code}
              d={s.d}
              fill={rateColor(v)}
              className={`pref${hovered === s.code ? " is-hover" : ""}`}
              onClick={() => onSelect(s.code)}
              onMouseEnter={() => onHover(s.code)}
            >
              <title>{`${s.name}　${label} ${fmtRate(v)}`}</title>
            </path>
          );
        })}
      </g>
      {sel && <path d={sel.d} className="pref-selected" aria-hidden="true" />}
    </svg>
  );
}
