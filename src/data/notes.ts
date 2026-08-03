export interface NoteLink {
  label: string
  url: string
}

export interface CourseNote {
  id: string
  course: string
  term: string
  description: string
  links: NoteLink[]
}

export const notes: CourseNote[] = [
  {
    id: 'note-1',
    course: 'Example Course One (e.g. Machine Learning)',
    term: 'Fall 2024',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
  {
    id: 'note-2',
    course: 'Example Course Two (e.g. Probability & Statistics)',
    term: 'Fall 2023',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
]
