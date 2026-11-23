import { byteLength } from '@kbmjj123/json-editor/core'

/** Above this size the webview gets a truncated, read-only preview. */
export const MAX_PREVIEW_BYTES = 1024 * 1024

export function isLarge(text: string): boolean {
  return byteLength(text) > MAX_PREVIEW_BYTES
}

/**
 * Cut at a UTF-8 byte boundary so the preview never exceeds the cap even when
 * the document contains multi-byte characters.
 */
export function truncateToBytes(text: string, limit = MAX_PREVIEW_BYTES): string {
  if (byteLength(text) <= limit) return text

  let low = 0
  let high = text.length
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    if (byteLength(text.slice(0, middle)) <= limit) low = middle
    else high = middle - 1
  }
  return text.slice(0, low)
}
