import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "../lib/i18n";

type Props = { open: boolean; title: string; onClose: () => void; children: ReactNode };

// ネイティブ <dialog>（Esc で閉じる・フォーカス管理はブラウザに任せる）
export function Modal({ open, title, onClose, children }: Props) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="modal-inner">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t.close}>
            {t.close}
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
