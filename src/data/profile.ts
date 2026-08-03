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
  role: 'Your research focus / identity (e.g. Graduate Student in Machine Learning)',
  affiliation: 'Your institution or lab',
  bio: 'Write a short introduction here: your research interests, what you are currently working on, and what you want visitors to know. Two to four sentences is usually enough.',
  email: 'your-email@example.com',
  location: 'City, Country',
  links: [
    { label: 'GitHub', url: 'https://github.com/waterfall1889' },
    { label: 'Google Scholar', url: 'https://scholar.google.com' },
    { label: 'CV', url: '/cv.pdf' },
  ],
}
