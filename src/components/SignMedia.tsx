import type { SignMedia } from '../lib/signMedia'

interface Props {
  media: SignMedia
  mode: 'thumb' | 'full'
  alt: string
}

/** `thumb` muestra el primer fotograma del video; `full` lo reproduce en bucle. */
export function SignMediaView({ media, mode, alt }: Props) {
  if (media.kind === 'image') return <img src={media.src} alt={alt} />

  if (mode === 'thumb') {
    return <video src={`${media.src}#t=0.1`} preload="metadata" muted playsInline aria-hidden="true" />
  }
  return <video src={media.src} autoPlay loop muted playsInline controls aria-label={alt} />
}
