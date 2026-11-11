export interface SignMedia {
  kind: 'video' | 'image'
  src: string
}

const CANDIDATES = [
  { ext: 'mp4', kind: 'video', mime: 'video/' },
  { ext: 'gif', kind: 'image', mime: 'image/gif' },
] as const

/** "Por favor" → "por_favor", "Baño" → "bano": nombre de archivo esperado en public/videos/. */
export const mediaSlug = (word: string) =>
  word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')

const cache = new Map<string, Promise<SignMedia | null>>()

/**
 * Comprueba si existe el archivo pidiendo solo el primer byte. Se valida el tipo MIME porque
 * el servidor de desarrollo responde index.html (200) cuando un archivo no existe.
 */
async function findMedia(word: string): Promise<SignMedia | null> {
  const base = `${import.meta.env.BASE_URL}videos/${mediaSlug(word)}`
  for (const { ext, kind, mime } of CANDIDATES) {
    try {
      const res = await fetch(`${base}.${ext}`, { headers: { Range: 'bytes=0-0' } })
      const isMedia = res.ok && (res.headers.get('content-type') ?? '').startsWith(mime)
      void res.body?.cancel()
      if (isMedia) return { kind, src: `${base}.${ext}` }
    } catch {
      // Sin red o archivo ausente: se prueba el siguiente formato.
    }
  }
  return null
}

export function probeSignMedia(word: string): Promise<SignMedia | null> {
  let result = cache.get(word)
  if (!result) {
    result = findMedia(word)
    cache.set(word, result)
  }
  return result
}
