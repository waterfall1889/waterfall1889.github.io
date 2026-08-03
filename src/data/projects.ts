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
    title: 'Example Project One',
    period: '2025',
    summary: 'One sentence summarizing what this project does.',
    description:
      'Describe the background of the project, the part you were responsible for, the tech stack used, and the final outcome. Feel free to split this into multiple paragraphs to explain the design and challenges.',
    tags: ['React', 'TypeScript'],
    links: [
      { label: 'GitHub Repo', url: 'https://github.com/waterfall1889' },
      { label: 'Live Demo', url: '' },
    ],
  },
  {
    slug: 'project-two',
    title: 'Example Project Two',
    period: '2024',
    summary: 'One sentence summarizing what this project does.',
    description:
      'Describe the background of the project, the part you were responsible for, the tech stack used, and the final outcome.',
    tags: ['Python', 'Data Analysis'],
    links: [{ label: 'GitHub Repo', url: 'https://github.com/waterfall1889' }],
  },
]
