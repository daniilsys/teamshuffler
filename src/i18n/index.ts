import en from './locales/en.json';
import fr from './locales/fr.json';

type LocaleData = typeof en;
type SupportedLocale = 'en' | 'fr';

const locales: Record<SupportedLocale, LocaleData> = { en, fr };

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'fr'];

export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export function t(locale: string, key: string, vars?: Record<string, string | number>): string {
  const lang: SupportedLocale = isValidLocale(locale) ? locale : 'en';
  const keys = key.split('.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = locales[lang];
  for (const k of keys) value = value?.[k];

  if (typeof value !== 'string') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = locales['en'];
    for (const k of keys) fallback = fallback?.[k];
    value = typeof fallback === 'string' ? fallback : key;
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = (value as string).replace(`{${k}}`, String(v));
    }
  }

  return value as string;
}
