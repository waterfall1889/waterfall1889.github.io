#!/usr/bin/env node
/**
 * Migrate flat src/content/notes/images/* into per-note folders:
 *   images/<Group(Category)>/<NoteSlug>/<filename>
 * Also mirrors to public/notes-images/ with the same layout.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(__dirname, '..')
const notesDir = join(repoRoot, 'src', 'content', 'notes')
const imagesRoot = join(notesDir, 'images')
const publicRoot = join(repoRoot, 'public', 'notes-images')

const IMG_EXT = '(?:png|jpe?g|gif|webp|svg|bmp)'
const MD_IMAGE_REF_RE = new RegExp(
  `\\]\\((?:\\.\\./|\\./)?images/(.+?\\.${IMG_EXT})\\)`,
  'gi',
)
const HTML_IMAGE_REF_RE = new RegExp(
  `src=(["'])(?:\\.\\./|\\./)?images/(.+?\\.${IMG_EXT})\\1`,
  'gi',
)

function collectImageRefs(text) {
  const refs = new Set()
  for (const m of text.matchAll(MD_IMAGE_REF_RE)) {
    refs.add(m[1].replace(/\\/g, '/'))
  }
  for (const m of text.matchAll(HTML_IMAGE_REF_RE)) {
    refs.add(m[2].replace(/\\/g, '/'))
  }
  return refs
}

function findMarkdownFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'images' || entry.name === '整理前') continue
      files.push(...findMarkdownFiles(full))
    } else if (entry.name.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function noteImagePrefix(mdPath) {
  const rel = relative(notesDir, mdPath).replace(/\\/g, '/')
  const parts = rel.split('/')
  const file = parts.pop()
  const slug = file.replace(/\.md$/, '')
  const group = parts.join('/')
  return group ? `${group}/${slug}` : slug
}

function canonicalRef(prefix, ref) {
  const normalized = ref.replace(/\\/g, '/')
  if (normalized.startsWith('http')) return normalized
  const filename = normalized.includes('/') ? normalized.split('/').pop() : normalized
  return `${prefix}/${filename}`
}

function rewriteImageRefs(text, prefix) {
  let next = text
  next = next.replace(MD_IMAGE_REF_RE, (_full, ref) => {
    const canonical = canonicalRef(prefix, ref)
    return `](../images/${canonical})`
  })
  next = next.replace(HTML_IMAGE_REF_RE, (_full, quote, ref) => {
    const canonical = canonicalRef(prefix, ref)
    return `src=${quote}../images/${canonical}${quote}`
  })
  return next
}

function resolveSource(filename) {
  const found = []
  function walk(dir) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === filename) found.push(full)
    }
  }
  walk(imagesRoot)
  walk(publicRoot)
  return found[0]
}

function copyToDest(src, dest) {
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
}

function main() {
  let updatedNotes = 0
  let moved = 0

  for (const mdPath of findMarkdownFiles(notesDir)) {
    const prefix = noteImagePrefix(mdPath)
    const text = readFileSync(mdPath, 'utf8')
    const refs = new Set()

    for (const ref of collectImageRefs(text)) {
      const filename = ref.includes('/') ? ref.split('/').pop() : ref
      if (filename && !filename.startsWith('http')) refs.add(filename)
    }

    if (refs.size === 0) continue

    for (const filename of refs) {
      const destNote = join(imagesRoot, prefix, filename)
      const destPublic = join(publicRoot, prefix, filename)

      if (!existsSync(destNote)) {
        const src = resolveSource(filename)
        if (!src) {
          console.warn(`missing: ${filename} (note: ${prefix})`)
          continue
        }
        copyToDest(src, destNote)
        moved += 1
      }
      if (!existsSync(destPublic)) {
        copyToDest(existsSync(destNote) ? destNote : resolveSource(filename), destPublic)
      }
    }

    let next = rewriteImageRefs(text, prefix)

    if (next !== text) {
      writeFileSync(mdPath, next, 'utf8')
      updatedNotes += 1
      console.log(`updated ${relative(repoRoot, mdPath)}`)
    }
  }

  if (existsSync(imagesRoot)) {
    for (const entry of readdirSync(imagesRoot, { withFileTypes: true })) {
      if (entry.isFile()) {
        rmSync(join(imagesRoot, entry.name))
        console.log(`removed flat ${entry.name}`)
      }
    }
  }

  if (existsSync(publicRoot)) {
    for (const entry of readdirSync(publicRoot, { withFileTypes: true })) {
      if (entry.isFile()) rmSync(join(publicRoot, entry.name))
    }
  }

  console.log(`\nDone. notes updated: ${updatedNotes}, images placed: ${moved}`)
}

main()
