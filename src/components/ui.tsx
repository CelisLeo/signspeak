import type { ReactNode } from 'react'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Barra de 0 a 1 (flexores, confianza, buffer). */
export function Meter({ label, value, text }: { label: string; value: number; text?: string }) {
  const pct = Math.round(clamp01(value) * 100)
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <div
        className="meter-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="meter-value">{text ?? `${pct}%`}</span>
    </div>
  )
}

/** Barra centrada en cero (acelerómetro y giroscopio). */
export function CenterMeter({
  label,
  value,
  range,
  unit,
}: {
  label: string
  value: number
  range: number
  unit: string
}) {
  const ratio = Math.max(-1, Math.min(1, value / range))
  const width = Math.abs(ratio) * 50
  const left = ratio >= 0 ? 50 : 50 - width
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <div className="meter-track center" role="img" aria-label={`${label}: ${value.toFixed(1)} ${unit}`}>
        <div className="meter-zero" />
        <div className="meter-fill" style={{ left: `${left}%`, width: `${width}%` }} />
      </div>
      <span className="meter-value">{value.toFixed(1)}</span>
    </div>
  )
}

export function Chip({ tone, children }: { tone: 'ok' | 'warn' | 'err' | 'idle'; children: ReactNode }) {
  return <span className={`chip chip-${tone}`}>{children}</span>
}

export function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  )
}

export function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-content confirm"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="confirm-text">{message}</p>
        <div className="confirm-actions">
          <button className="btn-secondary" onClick={onCancel} autoFocus>
            Cancelar
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
