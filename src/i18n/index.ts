import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';

type LocaleData = typeof en;
type SupportedLocale = 'en' | 'fr' | 'de' | 'es';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const locales: Record<SupportedLocale, any> = { en, fr, de, es };

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'fr', 'de', 'es'];

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
