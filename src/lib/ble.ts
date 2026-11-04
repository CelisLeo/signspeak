/**
 * Cliente Web Bluetooth para el guante SignSpeak (ESP32 como servidor GATT).
 *
 * ⚠️ Estos valores DEBEN coincidir con el firmware del ESP32:
 *   - SERVICE_UUID / CHAR_UUID (característica con propiedad NOTIFY)
 *   - Nombre del dispositivo que empiece con DEVICE_NAME_PREFIX
 *   - Formato de trama (ver parseFrame)
 */
export const GLOVE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
export const GLOVE_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
export const DEVICE_NAME_PREFIX = 'SignSpeak'

/**
 * Formato de trama (25 bytes, little-endian):
 *   [0]      0xAA            encabezado
 *   [1]      seq (uint8)     contador de secuencia (0-255, da la vuelta)
 *   [2..11]  5 × int16       flexores (ADC crudo 0-4095): pulgar, índice, medio, anular, meñique
 *   [12..17] 3 × int16       acelerómetro crudo (MPU-6050, ±2g → 16384 LSB/g)
 *   [18..23] 3 × int16       giroscopio crudo (MPU-6050, ±250°/s → 131 LSB/(°/s))
 *   [24]     XOR de los bytes [1..23]
 */
export const FRAME_LEN = 25
const HEADER = 0xaa

export interface GloveFrame {
  seq: number
  flex: number[] // 5 valores crudos
  accel: number[] // 3 valores crudos
  gyro: number[] // 3 valores crudos
}

export function parseFrame(dv: DataView): GloveFrame | null {
  if (dv.byteLength < FRAME_LEN || dv.getUint8(0) !== HEADER) return null
  let checksum = 0
  for (let i = 1; i < FRAME_LEN - 1; i++) checksum ^= dv.getUint8(i)
  if (checksum !== dv.getUint8(FRAME_LEN - 1)) return null

  const values: number[] = []
  for (let i = 0; i < 11; i++) values.push(dv.getInt16(2 + i * 2, true))
  return {
    seq: dv.getUint8(1),
    flex: values.slice(0, 5),
    accel: values.slice(5, 8),
    gyro: values.slice(8, 11),
  }
}

// --- Tipos mínimos de Web Bluetooth (evita depender de @types/web-bluetooth) ---
interface BtCharacteristic extends EventTarget {
  value?: DataView
  startNotifications(): Promise<BtCharacteristic>
  stopNotifications(): Promise<BtCharacteristic>
}
interface BtService {
  getCharacteristic(uuid: string): Promise<BtCharacteristic>
}
interface BtServer {
  connected: boolean
  connect(): Promise<BtServer>
  disconnect(): void
  getPrimaryService(uuid: string): Promise<BtService>
}
interface BtDevice extends EventTarget {
  name?: string
  gatt?: BtServer
}
interface BtApi {
  requestDevice(options: unknown): Promise<BtDevice>
}

const getBluetooth = (): BtApi | undefined =>
  (navigator as unknown as { bluetooth?: BtApi }).bluetooth

export class GloveClient {
  private device: BtDevice | null = null
  private characteristic: BtCharacteristic | null = null

  onFrame?: (frame: GloveFrame) => void
  onBadFrame?: () => void
  onDisconnect?: () => void

  static isSupported(): boolean {
    return !!getBluetooth()
  }

  /** Abre el selector del navegador, empareja y se suscribe a las notificaciones. */
  async connect(): Promise<string> {
    const bt = getBluetooth()
    if (!bt) throw new Error('UNSUPPORTED')

    const device = await bt.requestDevice({
      filters: [{ services: [GLOVE_SERVICE_UUID] }, { namePrefix: DEVICE_NAME_PREFIX }],
      optionalServices: [GLOVE_SERVICE_UUID],
    })
    this.device = device
    device.addEventListener('gattserverdisconnected', this.handleDisconnected)
    await this.setup(device)
    return device.name ?? DEVICE_NAME_PREFIX
  }

  /** Reintenta la conexión con el último dispositivo (sin volver a mostrar el selector). */
  async reconnect(): Promise<void> {
    if (!this.device) throw new Error('NO_DEVICE')
    await this.setup(this.device)
  }

  disconnect(): void {
    this.detachCharacteristic()
    const gatt = this.device?.gatt
    if (gatt?.connected) gatt.disconnect()
  }

  private async setup(device: BtDevice): Promise<void> {
    if (!device.gatt) throw new Error('NO_GATT')
    this.detachCharacteristic()
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(GLOVE_SERVICE_UUID)
    const characteristic = await service.getCharacteristic(GLOVE_CHAR_UUID)
    characteristic.addEventListener('characteristicvaluechanged', this.handleValue)
    await characteristic.startNotifications()
    this.characteristic = characteristic
  }

  private detachCharacteristic(): void {
    this.characteristic?.removeEventListener('characteristicvaluechanged', this.handleValue)
    this.characteristic = null
  }

  private handleValue = (event: Event) => {
    const dv = (event.target as BtCharacteristic).value
    if (!dv) return
    const frame = parseFrame(dv)
    if (frame) this.onFrame?.(frame)
    else this.onBadFrame?.()
  }

  private handleDisconnected = () => {
    this.detachCharacteristic()
    this.onDisconnect?.()
  }
}
