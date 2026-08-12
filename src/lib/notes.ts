export interface Note {
  slug: string
  title: string
  category: 'course' | 'tech'
  tags: string[]
  date: string
  content: string
}

const rawModules = import.meta.glob('/src/content/notes/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const normalized = raw.replace(/\r\n/g, '\n')
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!match) {
    return { data: {}, body: normalized }
  }

  const [, frontmatter, body] = match
  const data: Record<string, string> = {}

  for (const line of frontmatter.split('\n')) {
    const lineMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
    if (!lineMatch) continue
    const [, key, value] = lineMatch
    data[key] = value.trim()
  }

  return { data, body: body.trim() }
}

function parseTags(value: string | undefined): string[] {
  if (!value) return []
  const inner = value.replace(/^\[/, '').replace(/\]$/, '')
  return inner
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function slugFromPath(path: string): string {
  const fileName = path.split('/').pop() ?? path
  return fileName.replace(/\.md$/, '')
}

/** Keep markdown as MarkText-relative `images/...`; rewrite only for the website. */
function rewriteNoteImagePaths(body: string): string {
  return body
    .replace(/(src=["'])(?:\.\/)?images\//g, '$1/notes-images/')
    .replace(/\]\((?:\.\/)?images\//g, '](/notes-images/')
}

export const notes: Note[] = Object.entries(rawModules)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const category = data.category === 'tech' ? 'tech' : 'course'
    const content = rewriteNoteImagePaths(body)

    return {
      slug: slugFromPath(path),
      title: data.title ?? slugFromPath(path),
      category,
      tags: parseTags(data.tags),
      date: data.date ?? '',
      content,
    } satisfies Note
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))
