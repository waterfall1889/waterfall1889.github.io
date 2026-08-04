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
    period: '2026.01 — 2026.07',
    title:
      'CauDiff: Causal Refinement for Diffusion-Based Data Augmentation in Industrial Time Series Anomaly Detection',
    org: 'Co-First Author · Submitted to AAAI Conference on Artificial Intelligence (AAAI 2027)',
    description:
      'Proposed CauDiff, a diffusion-based data augmentation framework that incorporates Granger-inspired predictive dependencies into time series anomaly detection. Learned a normal dependency reference and an anomaly deviation template from normal windows and a small anomaly support set, then used two DDPM branches to generate normal windows and anomaly residuals, combining them into anomaly candidates. Refined candidates by dependency agreement, diversity, and signal quality to construct the augmented training set. Evaluated generation quality on SMD and downstream anomaly detection on SMD, MSL, and PSM across five detector backbones under varying levels of normal-data scarcity, showing improved detection in several SMD and MSL settings with substantially lower training cost than diffusion baselines.',
    tags: ['Time Series', 'Diffusion Models', 'Causal Inference', 'Data Augmentation', 'Anomaly Detection'],
  },
]
