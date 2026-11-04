import type * as TF from '@tensorflow/tfjs'

export const REST_LABEL = 'Reposo'

/** Orden de las clases: DEBE ser el mismo que en el entrenamiento (o definirlo en meta.json). */
export const DEFAULT_LABELS = [
  'Hola', 'Gracias', 'Por favor', 'Sí', 'No', 'Bien', 'Mal', 'Agua',
  'Comida', 'Baño', 'Ayuda', 'Amigo', 'Familia', 'Amor', 'Casa',
  REST_LABEL,
]

export interface ModelMeta {
  labels: string[]
  windowSize: number
  /** Opcionales: parámetros de normalización calculados con los datos de entrenamiento (11 valores). */
  mean?: number[]
  std?: number[]
}

export type ModelState = 'loading' | 'ready' | 'missing' | 'error'

export class SignClassifier {
  private tf: typeof TF | null = null
  private model: TF.LayersModel | null = null
  meta: ModelMeta = { labels: DEFAULT_LABELS, windowSize: 50 }

  get ready(): boolean {
    return this.model !== null
  }

  /**
   * Carga public/model/model.json (+ .bin) y, si existe, public/model/meta.json.
   * Una vez que el service worker los precachea, funciona sin internet.
   */
  async load(): Promise<ModelState> {
    const base = `${import.meta.env.BASE_URL}model/`
    try {
      try {
        const res = await fetch(`${base}meta.json`)
        if (res.ok) this.meta = { ...this.meta, ...(await res.json()) }
      } catch {
        // Sin meta.json: se usan los valores por defecto.
      }

      const probe = await fetch(`${base}model.json`)
      const isJson = (probe.headers.get('content-type') ?? '').includes('json')
      if (!probe.ok || !isJson) return 'missing'

      const tf = await import('@tensorflow/tfjs')
      await tf.ready()
      this.tf = tf
      this.model = await tf.loadLayersModel(`${base}model.json`)

      // Calentamiento: la primera inferencia es la más lenta.
      this.predict(Array.from({ length: this.meta.windowSize }, () => new Array(11).fill(0)))
      return 'ready'
    } catch (err) {
      console.error('No se pudo cargar el modelo:', err)
      this.model = null
      return 'error'
    }
  }

  /** window: [windowSize][11] → probabilidades por clase. */
  predict(window: number[][]): number[] {
    const { tf, model } = this
    if (!tf || !model) return []
    const { mean, std } = this.meta
    const data = window.map((row) =>
      row.map((x, i) => (mean && std ? (x - mean[i]) / (std[i] || 1) : x)),
    )
    return tf.tidy(() => {
      const out = model.predict(tf.tensor3d([data])) as TF.Tensor
      return Array.from(out.dataSync())
    })
  }

  top(probs: number[]): { label: string; conf: number } {
    let best = 0
    probs.forEach((p, i) => {
      if (p > probs[best]) best = i
    })
    return { label: this.meta.labels[best] ?? '?', conf: probs[best] ?? 0 }
  }
}
