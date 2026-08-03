export interface ProjectLink {
  label: string
  url: string
}

export interface Project {
  slug: string
  title: string
  period: string
  summary: string
  description: string
  tags: string[]
  links: ProjectLink[]
}

export const projects: Project[] = [
  {
    slug: 'project-one',
    title: '示例项目一',
    period: '2025',
    summary: '一句话概括这个项目做了什么。',
    description:
      '在这里详细描述项目的背景、你负责的部分、使用的技术栈以及最终效果。可以分多段说明设计思路和遇到的挑战。',
    tags: ['React', 'TypeScript'],
    links: [
      { label: 'GitHub 仓库', url: 'https://github.com/waterfall1889' },
      { label: '在线演示', url: '' },
    ],
  },
  {
    slug: 'project-two',
    title: '示例项目二',
    period: '2024',
    summary: '一句话概括这个项目做了什么。',
    description:
      '在这里详细描述项目的背景、你负责的部分、使用的技术栈以及最终效果。',
    tags: ['Python', '数据分析'],
    links: [{ label: 'GitHub 仓库', url: 'https://github.com/waterfall1889' }],
  },
]
