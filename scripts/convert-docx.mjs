#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = join(__dirname, '..')
const notesDir = join(repoRoot, 'src', 'content', 'notes')

const inputDir = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(repoRoot, 'docx-notes')
const groupArg = process.argv[3]

if (!groupArg) {
  console.error('Usage: npm run convert-notes -- <folder-with-docx-files> <GroupName(Course|Tech)>')
  console.error('Example: npm run convert-notes -- docx-notes "Computer-System-Engineering(Course)"')
  process.exit(1)
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toFrontmatterDate(mtime) {
  return mtime.toISOString().slice(0, 10)
}

function main() {
  if (!existsSync(inputDir)) {
    console.error(`Input folder not found: ${inputDir}`)
    console.error('Usage: npm run convert-notes -- <folder-with-docx-files> <GroupName(Course|Tech)>')
    process.exit(1)
  }

  const groupMatch = groupArg.match(/\((course|tech)\)$/i)
  const category = groupMatch && groupMatch[1].toLowerCase() === 'tech' ? 'tech' : 'course'
  const groupDir = join(notesDir, groupArg)

  mkdirSync(groupDir, { recursive: true })

  const docxFiles = readdirSync(inputDir).filter((file) => extname(file).toLowerCase() === '.docx')

  if (docxFiles.length === 0) {
    console.log(`No .docx files found in ${inputDir}`)
    return
  }

  const converted = []
  const failed = []

  for (const file of docxFiles) {
    const inputPath = join(inputDir, file)
    const title = basename(file, extname(file))
    const slug = slugify(title)
    const outputPath = join(groupDir, `${slug}.md`)
    const mediaDir = join(notesDir, 'assets', slug)

    try {
      execFileSync(
        'pandoc',
        [inputPath, '-t', 'gfm+tex_math_dollars', '-o', outputPath, '--extract-media', mediaDir],
        { stdio: 'inherit' },
      )

      const body = readFileSync(outputPath, 'utf8')
      if (!body.startsWith('---\n')) {
        const mtime = statSync(inputPath).mtime
        const frontmatter = [
          '---',
          `title: ${title}`,
          `category: ${category}`,
          'tags: []',
          `date: ${toFrontmatterDate(mtime)}`,
          '---',
          '',
          body,
        ].join('\n')
        writeFileSync(outputPath, frontmatter)
      }

      converted.push({ file, slug })
    } catch (error) {
      failed.push({ file, error: error.message })
    }
  }

  console.log('\nConversion summary:')
  for (const { file, slug } of converted) {
    console.log(`  OK    ${file} -> src/content/notes/${groupArg}/${slug}.md`)
  }
  for (const { file, error } of failed) {
    console.log(`  FAIL  ${file}: ${error}`)
  }

  if (converted.length > 0) {
    console.log(
      '\nReview each generated file: fix category/tags, check math (OMML equations often need manual cleanup), and commit any extracted assets/ folders.',
    )
  }
}

main()
