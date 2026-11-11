import { useSignMedia } from '../hooks/useSignMedia'
import type { SignMedia } from '../lib/signMedia'
import { LSM_VOCABULARY, VOCAB_WORDS } from '../lib/vocabulary'
import type { VocabItem } from '../lib/vocabulary'
import { SignMediaView } from './SignMedia'

interface Props {
  onOpen: (item: VocabItem, media: SignMedia | null) => void
}

export function VocabularyGrid({ onOpen }: Props) {
  const media = useSignMedia(VOCAB_WORDS)

  return (
    <div className="letters-grid">
      {LSM_VOCABULARY.map((item) => {
        const found = media[item.word] ?? null
        return (
          <button
            key={item.id}
            className="letter-card vocab-card"
            onClick={() => onOpen(item, found)}
            aria-label={`Ver seña: ${item.word}`}
          >
            {found ? (
              <span className="vocab-media">
                <SignMediaView media={found} mode="thumb" alt="" />
              </span>
            ) : (
              <span className="vocab-icon">{item.icon}</span>
            )}
            <span className="letter-char">{item.word}</span>
          </button>
        )
      })}
    </div>
  )
}
