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
  name: 'Zhu Zimo',
  role: 'Undergraduate Student',
  affiliation: 'Shanghai Jiao Tong University | Software Engineering',
  bio: 'I am an undergraduate student in Software Engineering at Shanghai Jiao Tong University, with research interests in Large Language Models, Natural Language Processing, and Machine Learning. My work focuses on developing intelligent systems through model optimization, data-centric approaches, and AI applications. I have experience in full-stack engineering and AI projects, and I am interested in exploring the intersection of foundation models and real-world applications.',
  email: 'waterfall1889@sjtu.edu.cn',
  location: 'Shanghai, China',
  links: [
    { label: 'GitHub', url: 'https://github.com/waterfall1889' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/zimo-zhu-9155a7371/' },
    // { label: 'Google Scholar', url: 'https://scholar.google.com' },
    // { label: 'CV', url: '/cv.pdf' },
  ],
}
