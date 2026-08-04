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
    slug: 'lsm-tree-kv-store',
    title: 'LSM-Tree Based Key-Value Storage Engine',
    period: '',
    summary: 'A LevelDB-inspired, distributed-storage-style KV engine, built from scratch in C++17.',
    description:
      'Designed and implemented a full write/read path from scratch: a SkipList-based MemTable, immutable SSTable persistence, and multi-level compaction, matching the core architecture used in production LSM engines such as LevelDB and RocksDB. Accelerated point-lookup performance using Bloom Filters combined with MurmurHash3 indexing to reduce unnecessary disk reads for negative lookups. Implemented the memory-to-disk write pipeline and binary serialization layer, handling multi-level storage organization and compaction triggers. Directly informed by coursework in Computer System Engineering (GFS, RPC, distributed consistency) and Advanced Data Structure (skip lists, Bloom filters, hashing).',
    tags: ['C++17', 'Data Structures', 'Storage Systems'],
    links: [],
  },
  {
    slug: 'basic-interpreter',
    title: 'BASIC Language Interpreter',
    period: 'Dec 2024 – Jan 2025',
    summary: 'A graphical BASIC language interpreter with an integrated debugger.',
    description:
      'Built a graphical interpreter for the BASIC language with full lexical analysis, syntax parsing, runtime execution, and error handling. Implemented an integrated debugger supporting breakpoints, step-by-step execution, variable inspection, and infinite-loop detection.',
    tags: ['C++', 'Qt'],
    links: [
      { label: 'GitHub Repo', url: 'https://github.com/waterfall1889/BASIC-Interpreter-project' },
    ],
  },
  {
    slug: 'avant-garde-bookstore',
    title: 'Avant-garde Bookstore',
    period: 'Mar – Jun 2025',
    summary: 'A full-stack e-commerce platform with polyglot persistence and Redis caching.',
    description:
      'Built a full-stack e-commerce platform with polyglot persistence across MySQL, MongoDB, and Neo4j, paired with Redis caching for performance. Developed both the React frontend and the Spring Boot backend.',
    tags: ['React', 'Spring Boot', 'MySQL', 'Neo4j', 'MongoDB', 'Redis'],
    links: [
      { label: 'Frontend Repo', url: 'https://github.com/waterfall1889/bookstore-frontend-work' },
      { label: 'Backend Repo', url: 'https://github.com/waterfall1889/bookstore-backend-work' },
    ],
  },
  {
    slug: 'voyage-mate',
    title: 'Voyage-Mate',
    period: 'Jun – Jul 2025',
    summary: 'An intelligent travel assistant with conversational interaction and full-text search.',
    description:
      'Built an intelligent travel assistant featuring conversational interaction and Elasticsearch-based full-text search, with a React frontend and a Spring Boot backend backed by MySQL.',
    tags: ['React', 'Spring Boot', 'MySQL', 'Elasticsearch'],
    links: [{ label: 'GitHub Repo', url: 'https://github.com/tomorrowonce1010/new-voyage-mate' }],
  },
]
