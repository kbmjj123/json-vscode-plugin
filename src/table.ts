function cell(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value) ?? 'null'
}

export function tableFrom(data: unknown): { headers: string[]; rows: string[][] } | null {
  if (!Array.isArray(data)) return null
  const objects = data.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && !Array.isArray(item),
  )
  if (objects.length === 0) return null

  const headers: string[] = []
  for (const object of objects) {
    for (const key of Object.keys(object)) {
      if (!headers.includes(key)) headers.push(key)
    }
  }
  return {
    headers,
    rows: objects.map((object) => headers.map((key) => cell(object[key]))),
  }
}
