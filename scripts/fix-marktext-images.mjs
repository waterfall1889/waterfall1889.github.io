#!/usr/bin/env node
/**
 * Copy MarkText local images into per-note folders under:
 *   src/content/notes/images/<Group>/<NoteSlug>/
 *   public/notes-images/<Group>/<NoteSlug>/
 * Rewrite markdown to ../images/<Group>/<NoteSlug>/<filename>.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(__dirname, '..')
const notesDir = join(repoRoot, 'src', 'content', 'notes')
const imagesRoot = join(notesDir, 'images')
const publicRoot = join(repoRoot, 'public', 'notes-images')
const marktextImages = join(process.env.APPDATA || '', 'marktext', 'images')

const IMG_TAG_RE =
  /<img\b[^>]*\bsrc=["'](?:file:\/\/\/)?([A-Za-z]:[\\/][^"']+)["'][^>]*\/?>/gi
const MD_LOCAL_RE =
  /!\[([^\]]*)\]\((?:file:\/\/\/)?([A-Za-z]:[\\/][^)]+)\)/g

function toFsPath(ref) {
  return decodeURIComponent(ref.replace(/^file:\/\/\//i, '')).replace(/\//g, '\\')
}

function isMarktextImage(fsPath) {
  return fsPath.replace(/\//g, '\\').toLowerCase().includes('\\marktext\\images\\')
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

function mdImageUrl(prefix, filename) {
  return `../images/${prefix}/${filename}`
}

function copyImage(srcPath, prefix, name) {
  for (const root of [imagesRoot, publicRoot]) {
    const dir = join(root, prefix)
    mkdirSync(dir, { recursive: true })
    const dest = join(dir, name)
    if (!existsSync(dest)) copyFileSync(srcPath, dest)
  }
}

function main() {
  if (!existsSync(marktextImages)) {
    console.error(`MarkText images folder not found: ${marktextImages}`)
    process.exit(1)
  }

  let rewritten = 0
  let copied = 0
  const missing = new Set()

  for (const full of findMarkdownFiles(notesDir)) {
    const prefix = noteImagePrefix(full)
    let text = readFileSync(full, 'utf8')
    const before = text
    const needed = new Map()

    const collect = (ref) => {
      const fsPath = toFsPath(ref)
      if (!isMarktextImage(fsPath)) return null
      const name = basename(fsPath)
      needed.set(name, fsPath)
      return name
    }

    text = text.replace(IMG_TAG_RE, (fullMatch, src) => {
      const name = collect(src)
      if (!name) return fullMatch
      const width = (fullMatch.match(/\bwidth=["']?(\d+)/i) || [])[1]
      const alt = (fullMatch.match(/\balt=["']([^"']*)["']/i) || [])[1] || ''
      if (width) return `<img src="${mdImageUrl(prefix, name)}" alt="${alt}" width="${width}">`
      return `![${alt}](${mdImageUrl(prefix, name)})`
    })

    text = text.replace(MD_LOCAL_RE, (fullMatch, alt, src) => {
      const name = collect(src)
      return name ? `![${alt}](${mdImageUrl(prefix, name)})` : fullMatch
    })

    for (const [name, fsPath] of needed) {
      if (!existsSync(fsPath)) {
        missing.add(fsPath)
        continue
      }
      const destNote = join(imagesRoot, prefix, name)
      const had = existsSync(destNote)
      copyImage(fsPath, prefix, name)
      if (!had) copied += 1
    }

    if (text !== before) {
      writeFileSync(full, text, 'utf8')
      rewritten += 1
      console.log(`updated ${relative(repoRoot, full)}`)
    }
  }

  console.log(`\nDone. notes updated: ${rewritten}, images synced: ${copied}`)
  if (missing.size) {
    console.warn(`\nMissing (${missing.size}):`)
    for (const p of missing) console.warn(`  ${p}`)
    process.exitCode = 1
  }
}

main()
