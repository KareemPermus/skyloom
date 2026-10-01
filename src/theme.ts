export const colors = {
  primary: '#0EA5E9',
  primaryDark: '#0369A1',
  accent: '#6366F1',
  sun: '#F59E0B',
  ink: '#0F172A',
  muted: '#64748B',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  danger: '#EF4444',
  white: '#FFFFFF',
} as const;

export const gradients = {
  day: ['#38BDF8', '#6366F1'] as const,
  night: ['#1E293B', '#312E81'] as const,
  brand: ['#0EA5E9', '#6366F1'] as const,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const fonts = {
  heading: 'System',
  body: 'System',
} as const;

export const spacing = {
  screen: 24,
} as const;

export const theme = { colors, gradients, radii, fonts, spacing };
export type Theme = typeof theme;