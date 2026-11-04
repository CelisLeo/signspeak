const PREFIX = 'signspeak:'

export function loadValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    // Si el valor por defecto es un objeto, se mezcla para tolerar campos nuevos.
    if (
      fallback !== null &&
      typeof fallback === 'object' &&
      !Array.isArray(fallback) &&
      parsed !== null &&
      typeof parsed === 'object'
    ) {
      return { ...fallback, ...(parsed as object) } as T
    }
    return parsed as T
  } catch {
    return fallback
  }
}

export function saveValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando sin persistencia.
  }
}

export function removeValue(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Sin acceso a localStorage.
  }
}
