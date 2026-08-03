export interface SocialLink {
  label: string
  url: string
}

export interface Profile {
  name: string
  role: string
  affiliation: string
  bio: string
  avatar?: string
  email: string
  location: string
  links: SocialLink[]
}

export const profile: Profile = {
  name: '你的姓名',
  role: '研究方向 / 身份定位（如：机器学习方向研究生）',
  affiliation: '所在院校或机构',
  bio: '在这里写一段简短的自我介绍：你的研究兴趣、正在做的事情，以及希望访问者了解的重点。建议控制在 2-4 句话。',
  email: 'your-email@example.com',
  location: '城市, 国家',
  links: [
    { label: 'GitHub', url: 'https://github.com/waterfall1889' },
    { label: 'Google Scholar', url: 'https://scholar.google.com' },
    { label: 'CV', url: '/cv.pdf' },
  ],
}
