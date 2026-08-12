#!/usr/bin/env node
/**
 * Copy MarkText local images into:
 *   - src/content/notes/images/  (relative paths work in MarkText)
 *   - public/notes-images/       (served by Vite / GitHub Pages)
 * Rewrite markdown to ![](images/<filename>).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(__dirname, '..')
const notesDir = join(repoRoot, 'src', 'content', 'notes')
const noteImagesDir = join(notesDir, 'images')
const publicImagesDir = join(repoRoot, 'public', 'notes-images')
const marktextImages = join(process.env.APPDATA || '', 'marktext', 'images')

const IMG_TAG_RE =
  /<img\b[^>]*\bsrc=["'](?:file:\/\/\/)?([A-Za-z]:[\\/][^"']+)["'][^>]*\/?>/gi
const MD_LOCAL_RE =
  /!\[([^\]]*)\]\((?:file:\/\/\/)?([A-Za-z]:[\\/][^)]+)\)/g
const MD_PUBLIC_RE = /!\[([^\]]*)\]\((?:\/notes-images\/)([^)]+)\)/g

function toFsPath(ref) {
  return decodeURIComponent(ref.replace(/^file:\/\/\//i, '')).replace(/\//g, '\\')
}

function isMarktextImage(fsPath) {
  return fsPath.replace(/\//g, '\\').toLowerCase().includes('\\marktext\\images\\')
}

function mdUrl(filename) {
  return `images/${filename}`
}

function copyImage(srcPath, name) {
  for (const dir of [noteImagesDir, publicImagesDir]) {
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

  mkdirSync(noteImagesDir, { recursive: true })
  mkdirSync(publicImagesDir, { recursive: true })

  let rewritten = 0
  let copied = 0
  const missing = new Set()

  for (const file of readdirSync(notesDir).filter((f) => f.endsWith('.md'))) {
    const full = join(notesDir, file)
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
      if (width) {
        return `<img src="${mdUrl(name)}" alt="${alt}" width="${width}">`
      }
      return `![${alt}](${mdUrl(name)})`
    })

    text = text.replace(MD_LOCAL_RE, (fullMatch, alt, src) => {
      const name = collect(src)
      return name ? `![${alt}](${mdUrl(name)})` : fullMatch
    })

    // migrate previous absolute web paths to relative MarkText-friendly paths
    text = text.replace(MD_PUBLIC_RE, (_, alt, name) => {
      const srcPath = join(marktextImages, name)
      const publicPath = join(publicImagesDir, name)
      const notePath = join(noteImagesDir, name)
      if (existsSync(srcPath)) needed.set(name, srcPath)
      else if (existsSync(publicPath)) needed.set(name, publicPath)
      else if (existsSync(notePath)) needed.set(name, notePath)
      else missing.add(name)
      return `![${alt}](${mdUrl(name)})`
    })

    for (const [name, fsPath] of needed) {
      if (!existsSync(fsPath)) {
        missing.add(fsPath)
        continue
      }
      const beforeCount = [noteImagesDir, publicImagesDir].filter((dir) =>
        existsSync(join(dir, name)),
      ).length
      copyImage(fsPath, name)
      if (beforeCount < 2) copied += 1
    }

    if (text !== before) {
      writeFileSync(full, text, 'utf8')
      rewritten += 1
      console.log(`updated ${file}`)
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
