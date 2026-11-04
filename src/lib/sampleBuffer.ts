/**
 * Ventana deslizante: acumula muestras de 11 canales y entrega una ventana
 * completa (por defecto 50 muestras ≈ 1 s a 50 Hz) cada `stride` muestras nuevas.
 */
export class SlidingWindow {
  readonly size: number
  readonly stride: number
  private buffer: number[][] = []
  private sinceLast = 0

  constructor(size = 50, stride = 10) {
    this.size = size
    this.stride = stride
  }

  /** Devuelve una copia de la ventana cuando está lista, o null. */
  push(sample: number[]): number[][] | null {
    this.buffer.push(sample)
    if (this.buffer.length > this.size) this.buffer.shift()
    this.sinceLast++

    if (this.buffer.length === this.size && this.sinceLast >= this.stride) {
      this.sinceLast = 0
      return this.buffer.map((row) => row.slice())
    }
    return null
  }

  get fill(): number {
    return this.buffer.length
  }

  reset(): void {
    this.buffer = []
    this.sinceLast = 0
  }
}
