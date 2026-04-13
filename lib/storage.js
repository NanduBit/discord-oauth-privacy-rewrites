import { OAUTH_SCOPES } from "./scopes.js";

const REWRITE_SNAPSHOT_KEY = "rewriteSnapshotByTab";
const MAX_REWRITE_SNAPSHOTS = 50;

export function getPaused() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get("paused", (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(Boolean(data.paused));
    });
  });
}

export function setPaused(paused) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ paused }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

export function getScopeSettings() {
  const keys = OAUTH_SCOPES.map((scope) => `scope-${scope}`);

  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(data);
    });
  });
}

export function setScopeDisabled(scope, disabled) {
  const key = `scope-${scope}`;

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [key]: disabled ? "disabled" : "enabled" }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

export function setRewriteSnapshot(tabId, snapshot) {
  if (!tabId) return Promise.resolve();

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(REWRITE_SNAPSHOT_KEY, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const store = data[REWRITE_SNAPSHOT_KEY] || {};
      store[String(tabId)] = snapshot;

      const entries = Object.entries(store)
        .sort((a, b) => (Number(b[1]?.timestamp) || 0) - (Number(a[1]?.timestamp) || 0))
        .slice(0, MAX_REWRITE_SNAPSHOTS);

      chrome.storage.local.set({ [REWRITE_SNAPSHOT_KEY]: Object.fromEntries(entries) }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      });
    });
  });
}

export function getRewriteSnapshot(tabId) {
  if (!tabId) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(REWRITE_SNAPSHOT_KEY, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const store = data[REWRITE_SNAPSHOT_KEY] || {};
      resolve(store[String(tabId)] || null);
    });
  });
}
