export interface ResearchItem {
  id: string
  period: string
  title: string
  org: string
  description: string
  tags?: string[]
}

export const research: ResearchItem[] = [
  {
    id: 'research-1',
    period: '2024.09 — Present',
    title: 'Example research direction: xxx',
    org: 'Lab / Advisor / Institution name',
    description:
      'Summarize the background, methods, and outcomes of this research, e.g. projects you contributed to, publications, or skills gained.',
    tags: ['Keyword one', 'Keyword two'],
  },
  {
    id: 'research-2',
    period: '2023.06 — 2024.06',
    title: 'Example experience: undergraduate thesis / research training program',
    org: 'Department name',
    description: 'Describe the project, your role, and the results achieved.',
    tags: ['Keyword three'],
  },
]
