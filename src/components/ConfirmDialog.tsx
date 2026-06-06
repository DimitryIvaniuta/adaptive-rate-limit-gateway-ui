interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Small confirmation dialog for irreversible or high-impact operator actions.
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">{props.title}</h3>
        <p>{props.description}</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={props.onCancel}>Cancel</button>
          <button className="danger-button" type="button" onClick={props.onConfirm}>{props.confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
