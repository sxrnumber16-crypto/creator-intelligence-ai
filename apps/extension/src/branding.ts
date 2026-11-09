/**
 * Product identity - configurable per the master spec.
 * The backend also stores a brandName preference; the extension reads its own
 * override from storage (Settings > Branding) and falls back to these defaults.
 */

export interface Branding {
  productName: string;
  shortName: string;
  tagline: string;
}

export const DEFAULT_BRANDING: Branding = {
  productName: 'Creator Intelligence AI',
  shortName: 'CIA',
  tagline: 'YouTube growth, powered by real data and AI analysis',
};

export async function loadBranding(): Promise<Branding> {
  const stored = await chrome.storage.local.get(['branding']);
  return { ...DEFAULT_BRANDING, ...((stored.branding as Partial<Branding>) ?? {}) };
}

export async function saveBranding(branding: Branding): Promise<void> {
  await chrome.storage.local.set({ branding });
}
