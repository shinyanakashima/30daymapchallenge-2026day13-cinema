import { IND_COLOR, diffPt, fmtRate, type Indicator, type Rec, type Sex } from "../lib/data";
import { useI18n } from "../lib/i18n";

type Props = { pref: Rec | undefined; nation: Rec | undefined; sex: Sex };

export function TicketCard({ pref, nation, sex }: Props) {
  const { t, prefName, fmtPt } = useI18n();
  const inds: Indicator[] = ["cinemaRate", "outsideCinemaRate"];
  return (
    <section className="ticket" aria-live="polite" aria-label={t.ticketAria}>
      <div className="ticket-head">
        <p className="ticket-kicker">ADMIT ONE · {t.sex[sex]}</p>
        <h2 className="ticket-pref">{prefName(pref)}</h2>
        <p className="ticket-period">{t.period}</p>
      </div>
      <div className="ticket-body">
        {inds.map((k) => {
          const v = pref?.[k] ?? null;
          const n = nation?.[k] ?? null;
          const d = diffPt(v, n);
          return (
            <div className="stub" key={k}>
              <p className="stub-label">
                <i className="swatch" style={{ background: IND_COLOR[k] }} aria-hidden="true" />
                {t.ind[k]}
                <span className="stub-sub">{t.indSub[k]}</span>
              </p>
              <p className="stub-value">
                {v == null ? "—" : v.toFixed(1)}
                <small>%</small>
              </p>
              {v == null && pref?.missingReason && <p className="stub-missing">{t.missing}{pref.missingReason}</p>}
              <p className="stub-diff">
                {t.vsNational(fmtRate(n))} <strong className={d == null ? "" : d > 0 ? "up" : d < 0 ? "down" : ""}>{fmtPt(d)}</strong>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
