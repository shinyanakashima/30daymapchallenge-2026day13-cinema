import { IND_COLOR, type Indicator, type Rec } from "../lib/data";
import { useI18n } from "../lib/i18n";

// 立体表示の凡例：色＝指標、高さ＝行動者率（2本とも0〜100%の同じ尺度）
export function PillarLegend({ nation }: { nation: Rec | undefined }) {
  const { t } = useI18n();
  const inds: Indicator[] = ["cinemaRate", "outsideCinemaRate"];
  return (
    <figure className="legend pillar-legend" aria-label={t.legendAria}>
      <figcaption>{t.pillarCaption}</figcaption>
      <div className="pl-row">
        <svg viewBox="0 0 120 64" aria-hidden="true" className="pl-fig">
          <line x1="96" y1="4" x2="96" y2="60" stroke="#8a8490" />
          {[4, 18, 32, 46].map((y) => (
            <line key={y} x1="96" x2={y === 4 || y === 32 ? 102 : 99} y1={y} y2={y} stroke="#8a8490" />
          ))}
          <text x="104" y="7" fontSize="7" fill="#bdb4a6">100</text>
          <text x="104" y="35" fontSize="7" fill="#bdb4a6">50</text>
          <rect x="40" y={60 - 56 * 0.3} width="9" height={56 * 0.3} fill={IND_COLOR.cinemaRate} rx="1" />
          <rect x="54" y={60 - 56 * 0.53} width="9" height={56 * 0.53} fill={IND_COLOR.outsideCinemaRate} rx="1" />
          <ellipse cx="44.5" cy={60 - 56 * 0.3} rx="8" ry="2" fill="none" stroke={IND_COLOR.cinemaRate} />
          <line x1="20" x2="110" y1="60" y2="60" stroke="#4a4350" />
        </svg>
        <ul>
          {inds.map((k) => (
            <li key={k}>
              <i style={{ background: IND_COLOR[k] }} />
              {t.ind[k]}
              <span>{t.national} {nation?.[k]?.toFixed(1) ?? "—"}%</span>
            </li>
          ))}
          <li className="pl-ring">{t.ringNote}</li>
        </ul>
      </div>
    </figure>
  );
}
