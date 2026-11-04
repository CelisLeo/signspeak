import { useCallback, useEffect, useRef, useState } from 'react'
import { GloveClient } from '../lib/ble'
import type { GloveFrame } from '../lib/ble'
import { SlidingWindow } from '../lib/sampleBuffer'
import { REST_LABEL, SignClassifier } from '../lib/classifier'
import type { ModelState } from '../lib/classifier'
import { loadValue, removeValue, saveValue } from '../lib/storage'

export type GloveStatus = 'Desconectado' | 'Conectando...' | 'Conectado' | 'Reconectando...'

export interface Prediction {
  label: string
  conf: number
}
export interface LiveData {
  flex: number[] // 0 (dedo recto) – 1 (dedo doblado)
  accel: number[] // g
  gyro: number[] // °/s
  pred: Prediction | null
}
export interface GloveStats {
  hz: number
  lossPct: number
  frames: number
  fill: number
  windowSize: number
  inferMs: number
}
export interface Detection {
  label: string
  conf: number
  ts: number
}
export interface Calibration {
  open: number[] | null
  closed: number[] | null
}

const WINDOW_SIZE = 50
const STRIDE = 10
const CONSENSUS = 3 // predicciones consecutivas iguales para aceptar una seña
const LOG_LIMIT = 30
const CALIB_MS = 1300

const EMPTY_LIVE: LiveData = { flex: [0, 0, 0, 0, 0], accel: [0, 0, 0], gyro: [0, 0, 0], pred: null }
const EMPTY_STATS: GloveStats = { hz: 0, lossPct: 0, frames: 0, fill: 0, windowSize: WINDOW_SIZE, inferMs: 0 }

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

function normalizeFlex(raw: number[], cal: Calibration): number[] {
  return raw.map((v, i) => {
    if (cal.open && cal.closed) {
      const span = cal.closed[i] - cal.open[i]
      if (Math.abs(span) > 30) return clamp01((v - cal.open[i]) / span)
    }
    return clamp01(v / 4095) // sin calibrar: escala cruda del ADC de 12 bits
  })
}

function friendlyError(err: unknown): string | null {
  const e = err as Error
  if (e?.name === 'NotFoundError') return null // el usuario cerró el selector
  if (e?.message === 'UNSUPPORTED') return 'Este navegador no soporta Web Bluetooth. Usa Chrome en Android.'
  if (e?.name === 'SecurityError') return 'El navegador bloqueó el acceso a Bluetooth. Revisa los permisos.'
  if (e?.name === 'NetworkError') return 'No se pudo conectar. Acerca el guante, enciéndelo e inténtalo de nuevo.'
  return e?.message || 'No se pudo conectar con el guante.'
}

interface Options {
  threshold: number
  onDetect: (label: string, conf: number) => void
}

export function useGlove({ threshold, onDetect }: Options) {
  const [client] = useState(() => new GloveClient())
  const [classifier] = useState(() => new SignClassifier())

  const [status, setStatus] = useState<GloveStatus>('Desconectado')
  const [error, setError] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [live, setLive] = useState<LiveData>(EMPTY_LIVE)
  const [stats, setStats] = useState<GloveStats>(EMPTY_STATS)
  const [modelState, setModelState] = useState<ModelState>('loading')
  const [detection, setDetection] = useState<Detection | null>(null)
  const [log, setLog] = useState<Detection[]>(() => loadValue<Detection[]>('gloveLog', []))
  const [calibration, setCalibration] = useState<Calibration>(() =>
    loadValue<Calibration>('calibration', { open: null, closed: null }),
  )
  const [calibrating, setCalibrating] = useState<'open' | 'closed' | null>(null)

  // Estado de alta frecuencia: vive en refs para no re-renderizar a cada trama.
  const windowRef = useRef(new SlidingWindow(WINDOW_SIZE, STRIDE))
  const lastFrame = useRef<GloveFrame | null>(null)
  const flexNorm = useRef<number[]>([0, 0, 0, 0, 0])
  const pred = useRef<Prediction | null>(null)
  const lastSeq = useRef<number | null>(null)
  const total = useRef(0)
  const lost = useRef(0)
  const rateCount = useRef(0)
  const hz = useRef(0)
  const inferMs = useRef(0)
  const recent = useRef<string[]>([])
  const lastEmitted = useRef<string | null>(null)
  const capture = useRef<{ kind: 'open' | 'closed'; samples: number[][] } | null>(null)
  const calRef = useRef(calibration)
  const userDisconnected = useRef(false)
  const optsRef = useRef({ threshold, onDetect })

  useEffect(() => {
    optsRef.current = { threshold, onDetect }
  }, [threshold, onDetect])

  useEffect(() => {
    saveValue('gloveLog', log)
  }, [log])

  // Carga del modelo (offline desde caché del service worker).
  useEffect(() => {
    let cancelled = false
    classifier.load().then((state) => {
      if (cancelled) return
      if (state === 'ready' && classifier.meta.windowSize !== WINDOW_SIZE) {
        windowRef.current = new SlidingWindow(classifier.meta.windowSize, STRIDE)
      }
      setModelState(state)
    })
    return () => {
      cancelled = true
    }
  }, [classifier])

  // Conexión BLE: manejadores de tramas y desconexión.
  useEffect(() => {
    const infer = (w: number[][]) => {
      if (!classifier.ready) return
      try {
        const t0 = performance.now()
        const probs = classifier.predict(w)
        inferMs.current = performance.now() - t0
        const top = classifier.top(probs)
        pred.current = top

        const accepted = top.conf >= optsRef.current.threshold ? top.label : 'Incierto'
        recent.current = [...recent.current, accepted].slice(-CONSENSUS)

        if (accepted === REST_LABEL) lastEmitted.current = null // permite repetir la misma seña tras un reposo
        const stable =
          recent.current.length === CONSENSUS && recent.current.every((l) => l === accepted)
        if (stable && accepted !== REST_LABEL && accepted !== 'Incierto' && accepted !== lastEmitted.current) {
          lastEmitted.current = accepted
          const d: Detection = { label: accepted, conf: top.conf, ts: Date.now() }
          setDetection(d)
          setLog((prev) => [d, ...prev].slice(0, LOG_LIMIT))
          optsRef.current.onDetect(accepted, top.conf)
        }
      } catch (err) {
        console.error('Error de inferencia:', err)
      }
    }

    client.onFrame = (f) => {
      // Pérdida de tramas con el contador de secuencia (uint8 con vuelta).
      if (lastSeq.current !== null) {
        const gap = (f.seq - lastSeq.current - 1 + 256) % 256
        if (gap > 0 && gap < 128) lost.current += gap
      }
      lastSeq.current = f.seq
      total.current++
      rateCount.current++
      lastFrame.current = f

      capture.current?.samples.push(f.flex)

      const flex = normalizeFlex(f.flex, calRef.current)
      flexNorm.current = flex
      const sample = [
        ...flex,
        ...f.accel.map((a) => a / 16384), // g
        ...f.gyro.map((g) => g / 131 / 250), // ≈ -1 … 1
      ]
      const w = windowRef.current.push(sample)
      if (w) infer(w)
    }

    client.onBadFrame = () => {
      lost.current++
    }

    client.onDisconnect = async () => {
      if (userDisconnected.current) {
        setStatus('Desconectado')
        return
      }
      setStatus('Reconectando...')
      for (let i = 0; i < 3; i++) {
        await sleep(1500)
        try {
          await client.reconnect()
          setStatus('Conectado')
          return
        } catch {
          // Reintenta.
        }
      }
      setStatus('Desconectado')
      setError('Se perdió la conexión con el guante.')
    }

    return () => {
      client.onFrame = undefined
      client.onBadFrame = undefined
      client.onDisconnect = undefined
      userDisconnected.current = true
      client.disconnect()
    }
  }, [client, classifier])

  // Refresco de la UI a ~10 Hz mientras hay conexión.
  useEffect(() => {
    if (status !== 'Conectado') return
    let ticks = 0
    const id = setInterval(() => {
      ticks++
      if (ticks % 10 === 0) {
        hz.current = rateCount.current
        rateCount.current = 0
      }
      const f = lastFrame.current
      if (f) {
        setLive({
          flex: flexNorm.current,
          accel: f.accel.map((a) => a / 16384),
          gyro: f.gyro.map((g) => g / 131),
          pred: pred.current,
        })
      }
      const sent = total.current + lost.current
      setStats({
        hz: hz.current,
        lossPct: sent ? (lost.current / sent) * 100 : 0,
        frames: total.current,
        fill: windowRef.current.fill,
        windowSize: windowRef.current.size,
        inferMs: inferMs.current,
      })
    }, 100)
    return () => clearInterval(id)
  }, [status])

  const resetSession = () => {
    windowRef.current.reset()
    lastFrame.current = null
    pred.current = null
    lastSeq.current = null
    total.current = 0
    lost.current = 0
    rateCount.current = 0
    hz.current = 0
    recent.current = []
    lastEmitted.current = null
    setLive(EMPTY_LIVE)
    setStats(EMPTY_STATS)
  }

  const connect = useCallback(async () => {
    setError(null)
    setStatus('Conectando...')
    try {
      userDisconnected.current = false
      resetSession()
      const name = await client.connect()
      setDeviceName(name)
      setStatus('Conectado')
    } catch (err) {
      setStatus('Desconectado')
      setError(friendlyError(err))
    }
    // resetSession solo usa refs y setters estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  const disconnect = useCallback(() => {
    userDisconnected.current = true
    client.disconnect()
    setStatus('Desconectado')
  }, [client])

  const calibrate = useCallback((kind: 'open' | 'closed') => {
    if (!lastFrame.current || capture.current) return
    capture.current = { kind, samples: [] }
    setCalibrating(kind)
    setTimeout(() => {
      const c = capture.current
      capture.current = null
      setCalibrating(null)
      if (!c || c.samples.length < 5) return
      const medians = [0, 1, 2, 3, 4].map((i) => median(c.samples.map((s) => s[i])))
      const next = { ...calRef.current, [kind]: medians }
      calRef.current = next
      setCalibration(next)
      saveValue('calibration', next)
    }, CALIB_MS)
  }, [])

  const resetCalibration = useCallback(() => {
    const empty: Calibration = { open: null, closed: null }
    calRef.current = empty
    setCalibration(empty)
    removeValue('calibration')
  }, [])

  const clearLog = useCallback(() => {
    setLog([])
    setDetection(null)
  }, [])

  return {
    supported: GloveClient.isSupported(),
    status,
    error,
    deviceName,
    live,
    stats,
    modelState,
    detection,
    log,
    calibration,
    calibrating,
    connect,
    disconnect,
    calibrate,
    resetCalibration,
    clearLog,
  }
}
