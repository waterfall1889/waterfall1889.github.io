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
    period: '2024.09 — 至今',
    title: '示例研究方向：xxx 相关研究',
    org: '实验室 / 导师 / 机构名称',
    description:
      '简述该阶段研究工作的背景、方法和产出，例如参与的课题、发表的成果或掌握的技能。',
    tags: ['关键词一', '关键词二'],
  },
  {
    id: 'research-2',
    period: '2023.06 — 2024.06',
    title: '示例科研经历：本科毕设 / 科研训练项目',
    org: '所在院系',
    description: '描述项目内容、你的角色以及取得的成果。',
    tags: ['关键词三'],
  },
]
