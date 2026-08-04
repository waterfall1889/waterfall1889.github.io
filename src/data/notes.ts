export interface NoteLink {
  label: string
  url: string
}

export interface CourseNote {
  id: string
  course: string
  description: string
  links: NoteLink[]
}

export const notes: CourseNote[] = [
  {
    id: 'note-1',
    course: 'Introduction to Computer Systems I',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
  {
    id: 'note-2',
    course: 'Introduction to Computer Systems II',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
  {
    id: 'note-3',
    course: 'Computer System Engineering',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
  {
    id: 'note-4',
    course: 'Discrete Mathematics',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
  {
    id: 'note-5',
    course: 'Architecture of Applications',
    description: 'Course notes covering the main concepts and problem-set summaries.',
    links: [{ label: 'Notes link', url: '' }],
  },
]
