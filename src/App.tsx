import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import './App.css'
import './glove.css'
import './theme.css'
import { useSettings } from './hooks/useSettings'
import { useGlove, RECORD_SAMPLES } from './hooks/useGlove'
import { loadValue, saveValue } from './lib/storage'
import { DEVICE_NAME_PREFIX } from './lib/ble'
import { REST_LABEL } from './lib/classifier'
import { buildCsv, datasetFileName, downloadCsv } from './lib/datasetCsv'
import type { DatasetRecording } from './lib/datasetCsv'
import type { SignMedia } from './lib/signMedia'
import { ALPHABET, LSM_VOCABULARY, VOCAB_WORDS } from './lib/vocabulary'
import type { VocabItem } from './lib/vocabulary'
import { CenterMeter, Chip, ConfirmDialog, Meter, Switch, Tile } from './components/ui'
import { SignMediaView } from './components/SignMedia'
import { VocabularyGrid } from './components/VocabularyGrid'

const APP_VERSION = '3.0'

const NAV_ITEMS = [
  { id: 'home', icon: '🏡', label: 'Inicio' },
  { id: 'glove', icon: '🧤', label: 'Guante' },
  { id: 'translate', icon: '💬', label: 'Traducir' },
  { id: 'letters', icon: '📚', label: 'Letras' },
  { id: 'settings', icon: '⚙️', label: 'Ajustes' },
]

const FINGERS = ['Pulgar', 'Índice', 'Medio', 'Anular', 'Meñique']
const AXES = ['X', 'Y', 'Z']
const RECORD_LABELS = [...VOCAB_WORDS, REST_LABEL]

const iconFor = (word: string) => LSM_VOCABULARY.find((v) => v.word === word)?.icon ?? '🤟'
const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

interface PendingConfirm {
  message: string
  label: string
  action: () => void
}

interface SelectedSign {
  item: VocabItem
  media: SignMedia | null
}

function App() {
  const [currentTab, setCurrentTab] = useState('home')
  const [dailyLetter, setDailyLetter] = useState(() => loadValue('dailyLetter', 'S'))
  const [inputText, setInputText] = useState('')
  const [history, setHistory] = useState<string[]>(() => loadValue<string[]>('history', []))
  const [libraryMode, setLibraryMode] = useState<'alphabet' | 'vocabulary'>('alphabet')
  const [letterBag, setLetterBag] = useState<string[]>([])
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [selectedSign, setSelectedSign] = useState<SelectedSign | null>(null)
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [recordLabel, setRecordLabel] = useState(RECORD_LABELS[0])
  const [participant, setParticipant] = useState(() => loadValue('participant', ''))

  const { settings, update, reset: resetSettings, voices, speak, speechSupported } = useSettings()

  const handleDetect = useCallback(
    (label: string) => {
      if (settings.autoSpeak) speak(label)
      navigator.vibrate?.(60)
      setToast(`🧤 ${label}`)
    },
    [settings.autoSpeak, speak],
  )

  const handleRecorded = useCallback((rec: DatasetRecording) => {
    navigator.vibrate?.(40)
    setToast(`✓ ${rec.label} grabada`)
  }, [])

  const glove = useGlove({ threshold: settings.threshold, onDetect: handleDetect, onRecorded: handleRecorded })
  const isLinked = glove.status === 'Conectado' || glove.status === 'Reconectando...'
  const recordBusy = glove.countdown > 0 || glove.recordingLabel !== null

  useEffect(() => saveValue('history', history), [history])
  useEffect(() => saveValue('dailyLetter', dailyLetter), [dailyLetter])
  useEffect(() => saveValue('participant', participant), [participant])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const askConfirm = (message: string, label: string, action: () => void) =>
    setPending({ message, label, action })

  const handleConnect = () => {
    if (isLinked) {
      askConfirm('¿Quieres desconectar el guante?', 'Desconectar', () => {
        glove.disconnect()
        setToast('Guante desconectado')
      })
      return
    }
    glove.connect()
  }

  const handleDownloadCsv = () => {
    if (glove.recordings.length === 0) return
    downloadCsv(buildCsv(glove.recordings), datasetFileName())
    setToast(`CSV descargado · ${glove.recordings.length} grabaciones`)
  }

  const handleTranslate = () => {
    const trimmed = inputText.trim()
    if (trimmed === '') return

    const newItem = trimmed.toUpperCase()
    const existingIndex = history.indexOf(newItem)

    if (existingIndex !== -1) {
      setSelectedHistoryIndex(existingIndex)
      speak(trimmed)
      setInputText('')
      setToast('Ya está en el historial ✨')
      return
    }

    setHistory([newItem, ...history])
    setSelectedHistoryIndex(0)
    speak(trimmed)
    setInputText('')
  }

  const handleInputKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTranslate()
    }
  }

  const handleHistoryClick = (item: string, index: number) => {
    setSelectedHistoryIndex(index)
    speak(item)
  }

  const removeHistoryItem = (index: number) => {
    setHistory((h) => h.filter((_, i) => i !== index))
    setSelectedHistoryIndex(0)
  }

  const clearHistory = () => {
    if (history.length === 0) return
    askConfirm('¿Borrar todo el historial?', 'Borrar', () => {
      setHistory([])
      setSelectedHistoryIndex(0)
      setInputText('')
      setToast('Historial borrado')
    })
  }

  const openLetterModal = (letter: string) => {
    setSelectedLetter(letter)
    speak(letter)
  }

  const openSignModal = (item: VocabItem, media: SignMedia | null) => {
    setSelectedSign({ item, media })
    speak(item.word)
  }

  const renderSignCards = (text: string) => {
    const upperText = text.toUpperCase().trim()
    if (!upperText) return null

    // "LL" y "RR" son letras propias del abecedario de la LSM.
    const tokens: string[] = []
    let i = 0
    while (i < upperText.length) {
      const twoChars = upperText.substring(i, i + 2)
      if (twoChars === 'LL' || twoChars === 'RR') {
        tokens.push(twoChars)
        i += 2
      } else {
        tokens.push(upperText[i])
        i += 1
      }
    }

    return tokens.map((token, idx) => {
      if (token === ' ') return <div key={idx} className="sign-spacer" />

      if (ALPHABET.includes(token)) {
        return (
          <button key={idx} className="sign-image-card" onClick={() => openLetterModal(token)} aria-label={`Letra ${token}`}>
            <img src={`${import.meta.env.BASE_URL}letras/${token}.png`} alt="" />
            <span>{token}</span>
          </button>
        )
      }
      return (
        <div key={idx} className="sign-image-card unknown">
          {token}
        </div>
      )
    })
  }

  const generateNewLetter = () => {
    let bag = [...letterBag]
    if (bag.length === 0) {
      bag = [...ALPHABET].sort(() => Math.random() - 0.5)
    }
    const nextLetter = bag.pop()!
    setLetterBag(bag)
    setDailyLetter(nextLetter)
    speak(nextLetter)
  }

  const activeIndex = NAV_ITEMS.findIndex((item) => item.id === currentTab)

  const modelChip = {
    loading: { tone: 'idle', text: 'Cargando modelo…' },
    ready: { tone: 'ok', text: 'Modelo listo · funciona sin internet' },
    missing: { tone: 'warn', text: 'Falta el modelo en /model' },
    error: { tone: 'err', text: 'Error al cargar el modelo' },
  }[glove.modelState] as { tone: 'ok' | 'warn' | 'err' | 'idle'; text: string }

  const statusTone = glove.status === 'Conectado' ? 'ok' : glove.status === 'Desconectado' ? 'idle' : 'warn'
  const hasCalibration = !!(glove.calibration.open && glove.calibration.closed)
  const recordedOfLabel = glove.recordings.filter((r) => r.label === recordLabel).length

  const renderScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <div className="screen fade-in">
            <header className="brand-header">
              <div className="brand-logo-img">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo de SignSpeak" />
              </div>
              <div className="brand-text">
                <h1 className="brand-name">
                  Sign<span className="brand-accent">Speak</span>
                </h1>
                <p className="brand-tagline">Tu traductor de Lengua de Señas Mexicana</p>
              </div>
            </header>

            <div className="status-card">
              <div className="status-icon">📡</div>
              <div className="status-info">
                <h3>Guante</h3>
                <p className={glove.status === 'Conectado' ? 'text-success' : 'text-muted'}>
                  {glove.status === 'Conectado' ? `Conectado · ${glove.deviceName}` : glove.status}
                </p>
              </div>
              <button
                className={`btn-connect ${isLinked ? 'connected danger' : ''}`}
                onClick={handleConnect}
                disabled={glove.status === 'Conectando...' || !glove.supported}
              >
                <span className={`dot ${glove.status === 'Conectado' ? 'live' : ''}`}></span>
                {isLinked ? 'Desconectar' : 'Conectar'}
              </button>
              {!glove.supported && (
                <p className="notice full">
                  Este navegador no permite Bluetooth. Abre SignSpeak en Chrome para Android.
                </p>
              )}
              {glove.error && <p className="notice full">{glove.error}</p>}
            </div>

            {glove.detection && (
              <button className="card last-detection" onClick={() => setCurrentTab('glove')}>
                <span className="last-icon">{iconFor(glove.detection.label)}</span>
                <span className="last-text">
                  <small>Última seña · {timeOf(glove.detection.ts)}</small>
                  <strong>{glove.detection.label}</strong>
                </span>
                <span className="last-conf">{Math.round(glove.detection.conf * 100)}%</span>
              </button>
            )}

            <div className="card highlight-card">
            <h3>Letra del día</h3>
            <button
              className="letter-display"
              onClick={() => openLetterModal(dailyLetter)}
              aria-label={`Ver seña de la letra ${dailyLetter}`}
            >
              <span className="letter-frame">
                <span className="letter-badge" aria-hidden="true">{dailyLetter}</span>
                <img
                  src={`${import.meta.env.BASE_URL}letras/${dailyLetter}.png`}
                  alt={`Seña ${dailyLetter}`}
                  className="letter-img-large"
                />
              </span>
            </button>
            <button className="btn-primary" onClick={generateNewLetter}>
              ✨ Generar nueva letra
            </button>
          </div>
        </div>
        )

      case 'glove':
        return (
          <div className={`screen fade-in ${isLinked ? '' : 'is-offline'}`}>
            <header className="screen-header">
              <h1>Métricas del guante</h1>
              <p>Sensores y reconocimiento en vivo</p>
            </header>

            <div className="status-card">
              <div className="status-info">
                <h3>Conexión</h3>
                <p>
                  <Chip tone={statusTone}>{glove.status}</Chip>
                </p>
              </div>
              <button
                className={`btn-connect ${isLinked ? 'connected danger' : ''}`}
                onClick={handleConnect}
                disabled={glove.status === 'Conectando...' || !glove.supported}
              >
                {isLinked ? 'Desconectar' : 'Conectar'}
              </button>
              {!glove.supported && (
                <p className="notice full">Usa Chrome en Android para conectar el guante por Bluetooth.</p>
              )}
              {glove.error && <p className="notice full">{glove.error}</p>}
              {!isLinked && glove.supported && !glove.error && (
                <p className="hint full">
                  Enciende el guante y toca Conectar. Busca un dispositivo llamado «{DEVICE_NAME_PREFIX}».
                </p>
              )}
            </div>

            <div className="card detect-card">
              <div className="detect-head">
                <h3>Reconocimiento</h3>
                <Chip tone={modelChip.tone}>{modelChip.text}</Chip>
              </div>
              {glove.detection ? (
                <button className="detect-big" onClick={() => speak(glove.detection!.label)}>
                  <span>{iconFor(glove.detection.label)}</span>
                  <strong>{glove.detection.label}</strong>
                  <small>🔊 Toca para escuchar</small>
                </button>
              ) : (
                <p className="hint">
                  {glove.modelState === 'ready'
                    ? 'Haz una seña con el guante puesto y aparecerá aquí.'
                    : 'Sin modelo no se puede reconocer. Coloca model.json y los .bin en public/model.'}
                </p>
              )}
              <Meter
                label={
                  glove.live.pred && glove.live.pred.label !== REST_LABEL
                    ? `Detectando: ${glove.live.pred.label}`
                    : 'Confianza'
                }
                value={glove.live.pred?.conf ?? 0}
              />
            </div>

            <div className="diagnostics-panel">
              <h3>Flexores</h3>
              {FINGERS.map((name, i) => (
                <Meter key={name} label={name} value={glove.live.flex[i]} />
              ))}
            </div>

            <div className="diagnostics-panel">
              <h3>Inercial (MPU-6050)</h3>
              {AXES.map((ax, i) => (
                <CenterMeter key={`a${ax}`} label={`Acel. ${ax}`} value={glove.live.accel[i]} range={2} unit="g" />
              ))}
              {AXES.map((ax, i) => (
                <CenterMeter key={`g${ax}`} label={`Giro ${ax}`} value={glove.live.gyro[i]} range={250} unit="°/s" />
              ))}
            </div>

            <div className="diagnostics-panel">
              <h3>Calidad del enlace</h3>
              <div className="tiles">
                <Tile value={`${glove.stats.hz}`} label="Hz" />
                <Tile value={`${glove.stats.lossPct.toFixed(1)}%`} label="Tramas perdidas" />
                <Tile value={`${glove.stats.inferMs.toFixed(0)} ms`} label="Inferencia" />
                <Tile value={`${glove.stats.fill}/${glove.stats.windowSize}`} label="Ventana" />
              </div>
              <p className="hint">{glove.stats.frames.toLocaleString('es-MX')} tramas recibidas</p>
            </div>

            <div className="diagnostics-panel">
              <h3>Calibración</h3>
              <p className="hint">
                Calibra al ponerte el guante: 1) mano abierta y dedos rectos, 2) puño cerrado. Mantén la posición
                un segundo.
              </p>
              <div className="calib-row">
                <button
                  className="btn-secondary"
                  onClick={() => glove.calibrate('open')}
                  disabled={!isLinked || glove.calibrating !== null}
                >
                  {glove.calibrating === 'open' ? 'Midiendo…' : `${glove.calibration.open ? '✓ ' : ''}Mano abierta`}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => glove.calibrate('closed')}
                  disabled={!isLinked || glove.calibrating !== null}
                >
                  {glove.calibrating === 'closed' ? 'Midiendo…' : `${glove.calibration.closed ? '✓ ' : ''}Puño cerrado`}
                </button>
              </div>
              <p className="hint">
                {hasCalibration ? 'Calibración guardada en este teléfono.' : 'Sin calibrar: se usa la escala cruda.'}
              </p>
            </div>

            <div className="diagnostics-panel">
              <h3>Grabar dataset</h3>
              <p className="hint">
                Elige la seña, toca Grabar y hazla cuando termine la cuenta regresiva. Cada grabación captura{' '}
                {RECORD_SAMPLES} muestras (≈1 s). Acumula las que necesites y descarga un solo CSV.
              </p>
              <div className="recorder-fields">
                <label className="field">
                  <span className="field-label">Seña</span>
                  <select value={recordLabel} onChange={(e) => setRecordLabel(e.target.value)} disabled={recordBusy}>
                    {RECORD_LABELS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Participante</span>
                  <input
                    type="text"
                    value={participant}
                    onChange={(e) => setParticipant(e.target.value)}
                    maxLength={12}
                    placeholder="P01"
                    disabled={recordBusy}
                  />
                </label>
              </div>

              <button
                className={`btn-primary rec-btn ${glove.recordingLabel ? 'recording' : ''}`}
                onClick={() => glove.startRecording(recordLabel, participant.trim())}
                disabled={!isLinked || recordBusy}
              >
                {glove.countdown > 0
                  ? `Prepárate… ${glove.countdown}`
                  : glove.recordingLabel
                    ? 'Grabando…'
                    : '⏺ Grabar'}
              </button>

              {glove.countdown > 0 && (
                <button className="btn-secondary wide" onClick={glove.cancelRecording}>
                  Cancelar
                </button>
              )}
              {glove.recordingLabel && (
                <div className="rec-progress">
                  <Meter label="Captura" value={glove.recordFill / RECORD_SAMPLES} text={`${glove.recordFill}/${RECORD_SAMPLES}`} />
                </div>
              )}

              <div className="tiles tiles-3">
                <Tile value={`${glove.recordings.length}`} label="Grabaciones" />
                <Tile value={`${recordedOfLabel}`} label={`De «${recordLabel}»`} />
                <Tile value={`${(glove.recordings.length * RECORD_SAMPLES).toLocaleString('es-MX')}`} label="Filas del CSV" />
              </div>

              <button className="btn-primary rec-download" onClick={handleDownloadCsv} disabled={glove.recordings.length === 0}>
                ⬇ Descargar CSV
              </button>
              <div className="recorder-actions">
                <button className="btn-secondary" onClick={glove.undoLastRecording} disabled={glove.recordings.length === 0}>
                  Deshacer última
                </button>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    askConfirm(`¿Descartar las ${glove.recordings.length} grabaciones sin descargar?`, 'Descartar', () => {
                      glove.clearRecordings()
                      setToast('Grabaciones descartadas')
                    })
                  }
                  disabled={glove.recordings.length === 0}
                >
                  Vaciar
                </button>
              </div>
              <p className="hint">Las grabaciones se guardan solo en memoria: descarga el CSV antes de cerrar la app.</p>
            </div>

            <div className="history-section">
              <div className="history-header">
                <h3>Señas detectadas</h3>
                {glove.log.length > 0 && (
                  <button className="btn-clear" onClick={glove.clearLog}>
                    🗑️ Limpiar
                  </button>
                )}
              </div>
              {glove.log.length === 0 ? (
                <div className="empty-state">
                  <span>🧤</span>
                  <p>Aún no hay señas detectadas</p>
                </div>
              ) : (
                glove.log.map((d) => (
                  <button key={d.ts} className="log-item" onClick={() => speak(d.label)}>
                    <span className="log-icon">{iconFor(d.label)}</span>
                    <span className="log-label">{d.label}</span>
                    <span className="log-meta">
                      {Math.round(d.conf * 100)}% · {timeOf(d.ts)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )

      case 'letters':
        return (
          <div className="screen fade-in">
            <header className="screen-header">
              <h1>Sign Library</h1>
              <p>Dactilología y Vocabulario LSM</p>
            </header>

            <div className="library-toggle">
              <button className={libraryMode === 'alphabet' ? 'active' : ''} onClick={() => setLibraryMode('alphabet')}>
                Abecedario
              </button>
              <button className={libraryMode === 'vocabulary' ? 'active' : ''} onClick={() => setLibraryMode('vocabulary')}>
                15 Señas
              </button>
            </div>

            {libraryMode === 'alphabet' ? (
              <div className="letters-grid">
                {ALPHABET.map((letter) => (
                  <button key={letter} className="letter-card" onClick={() => openLetterModal(letter)}>
                    <img
                      src={`${import.meta.env.BASE_URL}letras/${letter}.png`}
                      alt={`Seña ${letter}`}
                      className="letter-img-grid"
                      loading="lazy"
                    />
                    <span className="letter-char">{letter}</span>
                  </button>
                ))}
              </div>
            ) : (
              <VocabularyGrid onOpen={openSignModal} />
            )}
          </div>
        )

      case 'translate':
        return (
          <div className="screen fade-in">
            <header className="screen-header">
              <h1>Text to Sign</h1>
              <p>Traduce texto a lenguaje de señas</p>
            </header>

            <div className="translate-form">
              <textarea
                placeholder="Escribe una palabra o frase…"
                className="input-text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleInputKey}
                maxLength={30}
                aria-label="Texto a traducir"
              />
              <div className="input-footer">
                <span className="char-count">{inputText.length}/30</span>
                <button className="btn-primary" onClick={handleTranslate} disabled={!inputText.trim()}>
                  ✨ Traducir y reproducir
                </button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="sign-visualizer">
                <h3>Traducción visual</h3>
                <div className="sign-cards-container">
                  {renderSignCards(history[selectedHistoryIndex] ?? history[0])}
                </div>
                <p className="visualizer-hint">👆 Toca una letra para verla en grande</p>
              </div>
            )}

            <div className="history-section">
              <div className="history-header">
                <h3>Historial reciente</h3>
                {history.length > 0 && (
                  <button className="btn-clear" onClick={clearHistory}>
                    🗑️ Limpiar
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <p>Escribe algo arriba para empezar</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <div
                    key={item}
                    role="button"
                    tabIndex={0}
                    className={`history-item ${selectedHistoryIndex === index ? 'selected' : ''}`}
                    onClick={() => handleHistoryClick(item, index)}
                    onKeyDown={(e) => e.key === 'Enter' && handleHistoryClick(item, index)}
                  >
                    <span>{item}</span>
                    <span className="history-actions">
                      {selectedHistoryIndex === index && <span className="history-check">✓</span>}
                      <button
                        className="history-del"
                        aria-label={`Eliminar ${item}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          removeHistoryItem(index)
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="screen fade-in">
            <header className="screen-header">
              <h1>Ajustes</h1>
              <p>Apariencia, voz, detección y datos guardados</p>
            </header>

            <div className="card settings-card">
              <h3 className="settings-title">Apariencia</h3>
              <div className="switch-row">
                <span>
                  <strong>Modo oscuro</strong>
                  <small>Reduce el brillo de la pantalla</small>
                </span>
                <Switch checked={settings.darkMode} onChange={(v) => update({ darkMode: v })} label="Modo oscuro" />
              </div>
            </div>

            <div className="card settings-card">
              <h3 className="settings-title">Voz</h3>
              {!speechSupported && <p className="notice">Este navegador no tiene síntesis de voz.</p>}

              <span className="field-label">Velocidad</span>
              <div className="library-toggle">
                {[
                  { label: 'Lento', value: 0.7 },
                  { label: 'Normal', value: 1 },
                  { label: 'Rápido', value: 1.3 },
                ].map((p) => (
                  <button
                    key={p.label}
                    className={Math.abs(settings.rate - p.value) < 0.05 ? 'active' : ''}
                    onClick={() => update({ rate: p.value })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <label className="field">
                <span className="field-label">Tono</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={settings.pitch}
                  onChange={(e) => update({ pitch: Number(e.target.value) })}
                />
                <span className="field-hint">
                  <span>Grave</span>
                  <span>Agudo</span>
                </span>
              </label>

              <label className="field">
                <span className="field-label">Volumen · {Math.round(settings.volume * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.volume}
                  onChange={(e) => update({ volume: Number(e.target.value) })}
                />
              </label>

              {voices.length > 0 && (
                <label className="field">
                  <span className="field-label">Voz</span>
                  <select value={settings.voiceURI} onChange={(e) => update({ voiceURI: e.target.value })}>
                    <option value="">Predeterminada del sistema</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button className="btn-secondary wide" onClick={() => speak('Hola, así suena mi voz')}>
                🔊 Probar voz
              </button>
            </div>

            <div className="card settings-card">
              <h3 className="settings-title">Reconocimiento</h3>
              <div className="switch-row">
                <span>
                  <strong>Leer señas en voz alta</strong>
                  <small>Al detectar una seña con el guante</small>
                </span>
                <Switch
                  checked={settings.autoSpeak}
                  onChange={(v) => update({ autoSpeak: v })}
                  label="Leer señas en voz alta"
                />
              </div>
              <label className="field">
                <span className="field-label">Confianza mínima · {Math.round(settings.threshold * 100)}%</span>
                <input
                  type="range"
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  value={settings.threshold}
                  onChange={(e) => update({ threshold: Number(e.target.value) })}
                />
                <span className="field-hint">
                  <span>Más señas, más errores</span>
                  <span>Menos errores</span>
                </span>
              </label>
            </div>

            <div className="card settings-card">
              <h3 className="settings-title">Datos en este teléfono</h3>
              <p className="hint">
                {history.length} traducciones · {glove.log.length} señas detectadas ·{' '}
                {hasCalibration ? 'guante calibrado' : 'sin calibrar'}
              </p>
              <button
                className="btn-secondary wide"
                onClick={() =>
                  askConfirm('¿Restablecer la calibración del guante?', 'Restablecer', () => {
                    glove.resetCalibration()
                    setToast('Calibración restablecida')
                  })
                }
                disabled={!hasCalibration}
              >
                Restablecer calibración
              </button>
              <button
                className="btn-secondary wide"
                onClick={() =>
                  askConfirm('¿Volver a los ajustes originales?', 'Restablecer', () => {
                    resetSettings()
                    setToast('Ajustes restablecidos')
                  })
                }
              >
                Restablecer ajustes
              </button>
            </div>

            <p className="hint centered">
              SignSpeak v{APP_VERSION} · Apoyo para la comunicación; no sustituye a un intérprete de LSM.
            </p>
          </div>
        )

      default:
        return <div>Pantalla no encontrada</div>
    }
  }

  return (
    <div className="app-wrapper">
      <div className="app-container">
        {!online && <div className="offline-banner">Sin conexión · SignSpeak sigue funcionando</div>}

        <main className="main-content">{renderScreen()}</main>

        <nav className="bottom-nav" style={{ '--tabs': NAV_ITEMS.length } as CSSProperties} aria-label="Navegación principal">
          <div className="nav-indicator" style={{ transform: `translateX(${activeIndex * 100}%)` }} />
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
              aria-current={currentTab === item.id ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {selectedLetter && (
        <div className="modal-overlay" onClick={() => setSelectedLetter(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedLetter(null)} aria-label="Cerrar">
              ✕
            </button>
            <button className="modal-image-container clickable" onClick={() => speak(selectedLetter)}>
              <img src={`${import.meta.env.BASE_URL}letras/${selectedLetter}.png`} alt={`Seña ${selectedLetter}`} />
            </button>
            <h2>{selectedLetter}</h2>
            <p className="modal-hint">👆 Presiona la imagen para escuchar</p>
          </div>
        </div>
      )}

      {selectedSign && (
        <div className="modal-overlay" onClick={() => setSelectedSign(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedSign(null)} aria-label="Cerrar">
              ✕
            </button>
            <div className="modal-media">
              {selectedSign.media ? (
                <SignMediaView media={selectedSign.media} mode="full" alt={`Seña: ${selectedSign.item.word}`} />
              ) : (
                <span className="modal-emoji" aria-hidden="true">
                  {selectedSign.item.icon}
                </span>
              )}
            </div>
            <h2 className="modal-word">{selectedSign.item.word}</h2>
            <button className="btn-secondary" onClick={() => speak(selectedSign.item.word)}>
              🔊 Escuchar
            </button>
          </div>
        </div>
      )}

      {pending && (
        <ConfirmDialog
          message={pending.message}
          confirmLabel={pending.label}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            pending.action()
            setPending(null)
          }}
        />
      )}
    </div>
  )
}

export default App
