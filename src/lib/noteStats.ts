const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g
const READING_UNITS_PER_MINUTE = 320
const SECONDS_PER_IMAGE = 12

function stripMarkdown(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+\$/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countImages(body: string): number {
  const markdown = body.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []
  const html = body.match(/<img\b[^>]*>/gi) ?? []
  return markdown.length + html.length
}

export function countWords(body: string): number {
  const plain = stripMarkdown(body)
  const cjk = plain.match(CJK_RE)?.length ?? 0
  const latin = plain.replace(CJK_RE, ' ').split(/\s+/).filter(Boolean).length
  return cjk + latin
}

export function estimateReadingMinutes(body: string): number {
  const words = countWords(body)
  const images = countImages(body)
  const textMinutes = words / READING_UNITS_PER_MINUTE
  const imageMinutes = (images * SECONDS_PER_IMAGE) / 60
  const total = textMinutes + imageMinutes
  if (total < 0.5) return 1
  return Math.max(1, Math.round(total))
}

export function formatWordCount(count: number): string {
  return count.toLocaleString('en-US')
}

export function formatReadingTime(minutes: number): string {
  return minutes === 1 ? '1 min read' : `${minutes} min read`
}
