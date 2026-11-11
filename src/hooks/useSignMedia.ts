import { useEffect, useState } from 'react'
import { probeSignMedia } from '../lib/signMedia'
import type { SignMedia } from '../lib/signMedia'

/** Devuelve palabra → multimedia (o null si no existe). Una palabra ausente aún se está comprobando. */
export function useSignMedia(words: readonly string[]): Record<string, SignMedia | null> {
  const [media, setMedia] = useState<Record<string, SignMedia | null>>({})

  useEffect(() => {
    let cancelled = false
    Promise.all(words.map(async (word) => [word, await probeSignMedia(word)] as const)).then((entries) => {
      if (!cancelled) setMedia(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [words])

  return media
}
