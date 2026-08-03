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
    course: '示例课程一（如：机器学习）',
    term: '2024 秋',
    description: '课程笔记整理，包含主要知识点梳理和习题总结。',
    links: [{ label: '笔记链接', url: '' }],
  },
  {
    id: 'note-2',
    course: '示例课程二（如：概率论与数理统计）',
    term: '2023 秋',
    description: '课程笔记整理，包含主要知识点梳理和习题总结。',
    links: [{ label: '笔记链接', url: '' }],
  },
]
