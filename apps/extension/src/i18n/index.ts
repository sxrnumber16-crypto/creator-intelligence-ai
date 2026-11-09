/**
 * Lightweight i18n infrastructure.
 *
 * The v1 UI ships English strings inline; this module provides the t() lookup
 * and dictionary loading so additional locales can be added without refactoring:
 * 1. Add a dictionary file (e.g. src/i18n/dictionaries/es.json) with key->string.
 * 2. Register it in LOCALES below.
 * 3. Replace inline strings with t('key') where a locale matters.
 * Chrome's _locales system is used for manifest-level strings (extension name
 * and description stay English in v1 - see SECURITY.md / store listing docs).
 */

export type Locale = 'en';

type Dictionary = Record<string, string>;

const LOCALES: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => ({}), // English is the source language; t() falls back to the key text.
};

let activeLocale: Locale = 'en';
let cache: Dictionary = {};

export async function setLocale(locale: Locale): Promise<void> {
  cache = await LOCALES[locale]();
  activeLocale = locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

/** Translate a key with optional {placeholder} interpolation. */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = cache[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    }
  }
  return text;
}
