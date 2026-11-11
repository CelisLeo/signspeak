import { useCallback, useEffect, useRef, useState } from 'react'
import { loadValue, saveValue } from '../lib/storage'

export interface AppSettings {
  rate: number // 0.5 – 1.5
  pitch: number // 0.5 – 2
  volume: number // 0 – 1
  voiceURI: string // '' = voz por defecto del sistema
  autoSpeak: boolean // leer en voz alta las señas detectadas por el guante
  threshold: number // confianza mínima para aceptar una detección
  darkMode: boolean
}

const hasSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window

const prefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches

/** El tema inicial sigue al sistema hasta que el usuario elige uno. */
const defaultSettings = (): AppSettings => ({
  rate: 1,
  pitch: 1,
  volume: 1,
  voiceURI: '',
  autoSpeak: true,
  threshold: 0.8,
  darkMode: prefersDark(),
})

function getSpanishVoices(): SpeechSynthesisVoice[] {
  if (!hasSpeech()) return []
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadValue('settings', defaultSettings()))
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(getSpanishVoices)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
    saveValue('settings', settings)
  }, [settings])

  useEffect(() => {
    document.body.classList.toggle('dark', settings.darkMode)
  }, [settings.darkMode])

  // Muchos navegadores cargan las voces del sistema de forma asíncrona.
  useEffect(() => {
    if (!hasSpeech()) return
    const refresh = () => setVoices(getSpanishVoices())
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(defaultSettings()), [])

  const speak = useCallback((text: string) => {
    if (!hasSpeech() || !text) return
    const s = settingsRef.current
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-MX'
    utterance.rate = s.rate
    utterance.pitch = s.pitch
    utterance.volume = s.volume
    const voice = s.voiceURI ? synth.getVoices().find((v) => v.voiceURI === s.voiceURI) : undefined
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
    synth.speak(utterance)
  }, [])

  return { settings, update, reset, voices, speak, speechSupported: hasSpeech() }
}
