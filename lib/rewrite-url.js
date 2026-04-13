import {
  getPaused,
  getRewriteSnapshot,
  getScopeSettings,
  setRewriteSnapshot
} from "./storage.js";

const MATCH_URL = /^https?:\/\/((canary|ptb)\.)?discord\.com\/oauth2\/authorize/;

export async function rewriteUrl(tab) {
  if (!tab || !tab.id || !tab.url || !MATCH_URL.test(tab.url)) return;
  if (await getPaused()) return;

  const flowKey = getFlowKey(tab.url);
  const scopes = getScopes(tab.url);
  const settings = await getScopeSettings();

  const filteredScopes = scopes.filter((scope) => settings[`scope-${scope}`] !== "disabled");

  const existingSnapshot = await getRewriteSnapshot(tab.id);
  const isSameFlow = existingSnapshot && existingSnapshot.flowKey === flowKey;
  const originalScopes =
    isSameFlow && Array.isArray(existingSnapshot?.originalScopes)
      ? existingSnapshot.originalScopes
      : scopes;

  const removedScopes = originalScopes.filter((scope) => !filteredScopes.includes(scope));

  const snapshotToSave = {
    timestamp: Date.now(),
    flowKey,
    originalUrl: isSameFlow && existingSnapshot?.originalUrl ? existingSnapshot.originalUrl : tab.url,
    originalScopes,
    removedScopes,
    remainingScopes: filteredScopes
  };

  await setRewriteSnapshot(tab.id, snapshotToSave);

  if (filteredScopes.length === scopes.length) return;

  chrome.tabs.update(tab.id, {
    url: appendScope(new URL(tab.url), filteredScopes.join(" "))
  });
}

export function rewriteActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    void rewriteUrl(tabs[0]);
  });
}

function getScopes(url) {
  const parsed = new URL(url);
  const scope = parsed.searchParams.get("scope");

  if (!scope) return [];

  return scope.trim().split(/\s+/).filter(Boolean);
}

function appendScope(url, scope) {
  const params = new URLSearchParams(url.searchParams);

  params.delete("scope");
  params.append("scope", scope);

  url.search = params.toString();
  return url.toString();
}

function getFlowKey(url) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.searchParams);

  params.delete("scope");

  const sortedParams = new URLSearchParams();
  for (const [key, value] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    sortedParams.append(key, value);
  }

  return `${parsed.origin}${parsed.pathname}?${sortedParams.toString()}`;
}
