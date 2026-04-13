import { OAUTH_SCOPES } from "./scopes.js";

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
