import { diffPt, fmtPt, fmtRate, NATIONAL, SEX_LABEL, type Rec, type Sex } from "../lib/data";

// スクリーンリーダー・数値確認用の表（折りたたみ）
export function DataTable({ rows, nation, sex }: { rows: Rec[]; nation: Rec | undefined; sex: Sex }) {
  const prefs = rows.filter((r) => r.prefectureCode !== NATIONAL).sort((a, b) => a.prefectureCode.localeCompare(b.prefectureCode));
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table>
          <caption>
            都道府県別 映画鑑賞の行動者率（{SEX_LABEL[sex]}、%）と全国値との差（ポイント）
          </caption>
          <thead>
            <tr>
              <th scope="col">コード</th>
              <th scope="col">都道府県</th>
              <th scope="col">映画館</th>
              <th scope="col">全国との差</th>
              <th scope="col">映画館以外</th>
              <th scope="col">全国との差</th>
              <th scope="col">サンプルサイズ</th>
            </tr>
          </thead>
          <tbody>
            {nation && (
              <tr className="row-nation">
                <td>00</td>
                <th scope="row">全国</th>
                <td>{fmtRate(nation.cinemaRate)}</td>
                <td>—</td>
                <td>{fmtRate(nation.outsideCinemaRate)}</td>
                <td>—</td>
                <td>{nation.sampleSize?.toLocaleString("ja-JP") ?? "—"}</td>
              </tr>
            )}
            {prefs.map((r) => (
              <tr key={r.prefectureCode}>
                <td>{r.prefectureCode}</td>
                <th scope="row">{r.prefectureName}</th>
                <td>{fmtRate(r.cinemaRate)}</td>
                <td>{fmtPt(diffPt(r.cinemaRate, nation?.cinemaRate ?? null))}</td>
                <td>{fmtRate(r.outsideCinemaRate)}</td>
                <td>{fmtPt(diffPt(r.outsideCinemaRate, nation?.outsideCinemaRate ?? null))}</td>
                <td>{r.sampleSize?.toLocaleString("ja-JP") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">サンプルサイズは調査の回答者数で、映画を見た人の数ではありません。</p>
    </div>
  );
}
