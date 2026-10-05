import { improvadoUpdates } from './improvado-updates';

export type WorkRole = 'owner' | 'manager';

export interface WorkUpdate {
  title: string;
  date: string; // YYYY-MM-DD
  summary?: string;
  url: string;
  role: WorkRole;
  featured?: boolean;
}

export interface Workplace {
  id: string;
  name: string;
  period: string;
  description: string;
  website: string;
  updates: WorkUpdate[];
}

// Add a workplace here to create its section and navigation automatically.
// Add selected releases to updates; keep dates in ISO format for sorting.
export const workplaces: Workplace[] = [
  {
    id: 'improvado',
    name: 'Improvado',
    period: '2022 — сейчас',
    description: 'Платформа для маркетинговой аналитики. Продуктовые апдейты, над которыми я работал.',
    website: 'https://improvado.io/product-updates',
    updates: improvadoUpdates,
  },
];

export const roleLabels: Record<WorkRole, string> = {
  owner: 'Вёл целиком',
  manager: 'Вёл как менеджер',
};
