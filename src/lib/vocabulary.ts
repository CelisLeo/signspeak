export const ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'LL',
  'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'RR', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
]

export interface VocabItem {
  id: number
  word: string
  icon: string
}

export const LSM_VOCABULARY: VocabItem[] = [
  { id: 1, word: 'Hola', icon: '👋' },
  { id: 2, word: 'Gracias', icon: '🙏' },
  { id: 3, word: 'Por favor', icon: '🤲' },
  { id: 4, word: 'Sí', icon: '👍' },
  { id: 5, word: 'No', icon: '👎' },
  { id: 6, word: 'Bien', icon: '👌' },
  { id: 7, word: 'Mal', icon: '👎' },
  { id: 8, word: 'Agua', icon: '💧' },
  { id: 9, word: 'Comida', icon: '🍎' },
  { id: 10, word: 'Baño', icon: '🚻' },
  { id: 11, word: 'Ayuda', icon: '🆘' },
  { id: 12, word: 'Amigo', icon: '🤝' },
  { id: 13, word: 'Familia', icon: '👨‍👩‍👧' },
  { id: 14, word: 'Amor', icon: '❤️' },
  { id: 15, word: 'Casa', icon: '🏠' },
]

export const VOCAB_WORDS = LSM_VOCABULARY.map((v) => v.word)
