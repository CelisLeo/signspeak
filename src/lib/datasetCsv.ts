export interface DatasetRecording {
  label: string
  participant: string
  ts: number
  /** Ventana de 50 muestras × 11 canales, tal como la recibe el modelo. */
  samples: number[][]
}

/**
 * Las columnas de canales son exactamente la entrada del modelo:
 * flexores calibrados (0 = recto, 1 = doblado), aceleración en g y giroscopio en °/s ÷ 250.
 */
const HEADER = [
  'recording', 'participant', 'label', 't',
  'thumb', 'index', 'middle', 'ring', 'pinky',
  'acc_x', 'acc_y', 'acc_z', 'gyro_x', 'gyro_y', 'gyro_z',
]

const escapeCell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

/** Una fila por muestra; `recording` identifica cada ventana para poder separarlas al entrenar. */
export function buildCsv(recordings: DatasetRecording[]): string {
  const rows = [HEADER.join(',')]
  recordings.forEach((rec, i) => {
    rec.samples.forEach((sample, t) => {
      rows.push(
        [i + 1, escapeCell(rec.participant), escapeCell(rec.label), t, ...sample.map((v) => v.toFixed(5))].join(','),
      )
    })
  })
  return rows.join('\n')
}

export function datasetFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  const day = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`
  return `signspeak_dataset_${day}_${p(date.getHours())}${p(date.getMinutes())}.csv`
}

export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
