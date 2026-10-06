import { createContext, useContext } from 'react';

export const DEFAULT_SETTINGS = {
  siteTitle: "Tiju's Academy · Link Portal",
  noindex: true,
  notFoundUrl: '',
  hasLogo: false,
  hasFavicon: false,
  version: 0,
};

export const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, setSettings: () => {} });

export function useSettings() {
  return useContext(SettingsContext);
}

// Keep the browser tab in sync with saved settings without a reload.
export function applyDocumentSettings(settings) {
  document.title = settings.siteTitle;
  let icon = document.querySelector('link[rel="icon"]');
  if (!icon) {
    icon = document.createElement('link');
    icon.rel = 'icon';
    document.head.appendChild(icon);
  }
  icon.href = `/brand/favicon?v=${settings.version}`;
  let robots = document.querySelector('meta[name="robots"]');
  if (robots) robots.content = settings.noindex ? 'noindex, nofollow' : 'index, follow';
}
