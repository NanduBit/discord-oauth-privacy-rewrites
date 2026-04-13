import { DO_NOT_DISABLE, OAUTH_SCOPES, PLEASE_DISABLE } from "./lib/scopes.js";
import { rewriteActiveTab, rewriteUrl } from "./lib/rewrite-url.js";
import {
  getPaused,
  getRewriteSnapshot,
  getScopeSettings,
  setPaused,
  setScopeDisabled
} from "./lib/storage.js";

const scopesRoot = document.getElementById("scopes");
const errorBanner = document.getElementById("error-banner");
const pauseButton = document.getElementById("pause-button");
const pauseStatus = document.getElementById("pause-status");
const summaryOriginal = document.getElementById("summary-original");
const summaryRemoved = document.getElementById("summary-removed");
const summaryCurrent = document.getElementById("summary-current");
const summaryScopePicker = document.getElementById("summary-scope-picker");
const summaryScopeToggle = document.getElementById("summary-scope-toggle");
const summaryScopeMenu = document.getElementById("summary-scope-menu");
const summaryAddButton = document.getElementById("summary-add-button");

const MATCH_URL = /^https?:\/\/((canary|ptb)\.)?discord\.com\/oauth2\/authorize/;

init().catch(showError);

async function init() {
  if (
    !scopesRoot ||
    !pauseButton ||
    !pauseStatus ||
    !errorBanner ||
    !summaryOriginal ||
    !summaryRemoved ||
    !summaryCurrent ||
    !summaryScopePicker ||
    !summaryScopeToggle ||
    !summaryScopeMenu ||
    !summaryAddButton
  ) {
    throw new Error("Popup did not initialize correctly.");
  }

  const settings = await getScopeSettings();
  renderScopeGrid(settings);

  const paused = await getPaused();
  renderPauseState(paused);
  await renderScopeSummary();
  installLiveRefresh();

  pauseButton.addEventListener("click", async () => {
    try {
      const next = !(await getPaused());
      await setPaused(next);
      renderPauseState(next);
      rewriteActiveTab();
    } catch (error) {
      showError(error);
    }
  });

  summaryAddButton.addEventListener("click", async () => {
    try {
      if (!(summaryScopeToggle instanceof HTMLButtonElement)) return;

      const scope = summaryScopeToggle.dataset.value || "";
      if (!scope) return;

      await addSelectedScope(scope);
      await renderScopeSummary();
    } catch (error) {
      showError(error);
    }
  });

  summaryScopeToggle.addEventListener("click", () => {
    if (!(summaryScopePicker instanceof HTMLDivElement) || summaryScopeToggle.disabled) {
      return;
    }

    const isOpen = summaryScopePicker.classList.toggle("open");
    summaryScopeToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  summaryScopeMenu.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const scope = target.dataset.scope || "";
    if (!scope) return;

    setSelectedScope(scope);
    closeScopePicker();
  });

  document.addEventListener("click", (event) => {
    if (!(summaryScopePicker instanceof HTMLDivElement)) return;
    if (!summaryScopePicker.contains(event.target)) {
      closeScopePicker();
    }
  });
}

function installLiveRefresh() {
  let refreshTimer;

  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      void refreshPopupState();
    }, 80);
  };

  const onTabUpdated = (_tabId, changeInfo) => {
    if (typeof changeInfo.url === "string" || changeInfo.status === "loading") {
      scheduleRefresh();
    }
  };

  const onTabActivated = () => {
    scheduleRefresh();
  };

  const onStorageChanged = (changes, areaName) => {
    const changedKeys = Object.keys(changes || {});

    const hasScopeSettingChange = changedKeys.some((key) => key.startsWith("scope-"));
    const hasPauseChange = changedKeys.includes("paused");
    const hasRewriteSnapshotChange = changedKeys.includes("rewriteSnapshotByTab");

    if (
      (areaName === "sync" && (hasScopeSettingChange || hasPauseChange)) ||
      (areaName === "local" && hasRewriteSnapshotChange)
    ) {
      scheduleRefresh();
    }
  };

  chrome.tabs.onUpdated.addListener(onTabUpdated);
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.storage.onChanged.addListener(onStorageChanged);

  window.addEventListener("unload", () => {
    clearTimeout(refreshTimer);
    chrome.tabs.onUpdated.removeListener(onTabUpdated);
    chrome.tabs.onActivated.removeListener(onTabActivated);
    chrome.storage.onChanged.removeListener(onStorageChanged);
  });
}

async function refreshPopupState() {
  const settings = await getScopeSettings();
  renderScopeGrid(settings);

  const paused = await getPaused();
  renderPauseState(paused);

  await renderScopeSummary();
}

function renderScopeGrid(settings) {
  const fragment = document.createDocumentFragment();

  for (const scope of [...OAUTH_SCOPES].sort((a, b) => a.localeCompare(b))) {
    const label = document.createElement("label");
    label.className = "scope-item";

    const input = document.createElement("input");
    input.type = "checkbox";

    const disabled = settings[`scope-${scope}`] === "disabled";
    input.checked = disabled;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = scope;

    if (disabled) {
      name.classList.add("disabled");
    }

    input.addEventListener("change", async (event) => {
      try {
        const checked = event.currentTarget.checked;
        await setScopeDisabled(scope, checked);

        if (checked) {
          name.classList.add("disabled");
        } else {
          name.classList.remove("disabled");
        }

        rewriteActiveTab();
        await renderScopeSummary();
      } catch (error) {
        showError(error);
      }
    });

    label.appendChild(input);
    label.appendChild(name);

    if (DO_NOT_DISABLE.includes(scope)) {
      label.appendChild(makeIcon("ban", "?", "Disabling this may break apps"));
    }

    if (PLEASE_DISABLE.includes(scope)) {
      label.appendChild(makeIcon("warn", "!", "Please disable this for privacy"));
    }

    fragment.appendChild(label);
  }

  scopesRoot.innerHTML = "";
  scopesRoot.appendChild(fragment);
}

async function renderScopeSummary() {
  const tab = await getActiveTab();

  if (!tab || !tab.url || !MATCH_URL.test(tab.url)) {
    renderScopeList(summaryOriginal, []);
    renderScopeList(summaryRemoved, []);
    renderScopeList(summaryCurrent, []);
    renderAddScopeOptions([]);
    return;
  }

  const currentScopes = getScopesFromUrl(tab.url);
  const snapshot = tab.id ? await getRewriteSnapshot(tab.id) : null;

  const originalScopes = snapshot?.originalScopes?.length
    ? snapshot.originalScopes
    : currentScopes;
  const removedScopes = originalScopes.filter((scope) => !currentScopes.includes(scope));

  renderScopeList(summaryOriginal, originalScopes);
  renderScopeList(summaryRemoved, removedScopes, { canAddBack: true });
  renderScopeList(summaryCurrent, currentScopes, { canRemove: true });
  renderAddScopeOptions(currentScopes);
}

function renderAddScopeOptions(currentScopes) {
  if (!summaryAddButton || !summaryScopeToggle || !summaryScopeMenu) return;

  const currentSet = new Set(currentScopes || []);
  const available = [...OAUTH_SCOPES]
    .filter((scope) => !currentSet.has(scope))
    .sort((a, b) => a.localeCompare(b));

  summaryScopeMenu.innerHTML = "";

  if (!available.length) {
    summaryScopeToggle.textContent = "No scopes left to add";
    summaryScopeToggle.dataset.value = "";
    summaryScopeToggle.disabled = true;
    summaryAddButton.disabled = true;
    closeScopePicker();
    return;
  }

  const selectedScope = available.includes(summaryScopeToggle.dataset.value || "")
    ? summaryScopeToggle.dataset.value
    : available[0];

  for (const scope of available) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `scope-option${scope === selectedScope ? " active" : ""}`;
    option.dataset.scope = scope;
    option.textContent = scope;
    summaryScopeMenu.appendChild(option);
  }

  setSelectedScope(selectedScope || "");
  summaryScopeToggle.disabled = false;
  summaryAddButton.disabled = false;
}

function setSelectedScope(scope) {
  if (!summaryScopeToggle || !summaryScopeMenu) return;

  summaryScopeToggle.dataset.value = scope;
  summaryScopeToggle.textContent = scope || "Select scope";

  for (const node of summaryScopeMenu.children) {
    if (!(node instanceof HTMLButtonElement)) continue;
    node.classList.toggle("active", node.dataset.scope === scope);
  }
}

function closeScopePicker() {
  if (!(summaryScopePicker instanceof HTMLDivElement) || !summaryScopeToggle) return;

  summaryScopePicker.classList.remove("open");
  summaryScopeToggle.setAttribute("aria-expanded", "false");
}

function renderScopeList(root, scopes, options = {}) {
  if (!root) return;
  const { canAddBack = false, canRemove = false } = options;

  root.innerHTML = "";
  const uniqueScopes = [...new Set((scopes || []).filter(Boolean))];

  if (!uniqueScopes.length) {
    const empty = document.createElement("span");
    empty.className = "summary-empty";
    empty.textContent = "None";
    root.appendChild(empty);
    return;
  }

  uniqueScopes.sort((a, b) => a.localeCompare(b));
  for (const scope of uniqueScopes) {
    const chip = document.createElement("span");
    chip.className = `summary-scope${canAddBack ? " removed" : ""}`;

    const text = document.createElement("span");
    text.textContent = scope;
    chip.appendChild(text);

    if (canAddBack) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "summary-action";
      action.textContent = "x";
      action.title = `Add ${scope} back to URL`;
      action.addEventListener("click", async () => {
        try {
          await addScopeBack(scope);
          await renderScopeSummary();
        } catch (error) {
          showError(error);
        }
      });

      chip.appendChild(action);
    }

    if (canRemove) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "summary-action remove";
      action.textContent = "x";
      action.title = `Remove ${scope} and disable it`;
      action.addEventListener("click", async () => {
        try {
          await removeRequestedScope(scope);
          await renderScopeSummary();
        } catch (error) {
          showError(error);
        }
      });

      chip.appendChild(action);
    }

    root.appendChild(chip);
  }
}

async function addScopeBack(scope) {
  await setScopeDisabled(scope, false);

  const settings = await getScopeSettings();
  renderScopeGrid(settings);

  const tab = await getActiveTab();
  if (!tab?.id || !tab.url || !MATCH_URL.test(tab.url)) {
    return;
  }

  const currentScopes = getScopesFromUrl(tab.url);
  if (currentScopes.includes(scope)) {
    return;
  }

  const nextScopes = [...currentScopes, scope];
  const nextUrl = setScopesInUrl(tab.url, nextScopes);

  await new Promise((resolve, reject) => {
    chrome.tabs.update(tab.id, { url: nextUrl }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

async function removeRequestedScope(scope) {
  await setScopeDisabled(scope, true);

  const settings = await getScopeSettings();
  renderScopeGrid(settings);

  const tab = await getActiveTab();
  if (!tab || !tab.id || !tab.url || !MATCH_URL.test(tab.url)) {
    return;
  }

  await rewriteUrl(tab);
}

async function addSelectedScope(scope) {
  await setScopeDisabled(scope, false);

  const settings = await getScopeSettings();
  renderScopeGrid(settings);

  const tab = await getActiveTab();
  if (!tab?.id || !tab.url || !MATCH_URL.test(tab.url)) {
    return;
  }

  const currentScopes = getScopesFromUrl(tab.url);
  if (currentScopes.includes(scope)) {
    return;
  }

  const nextUrl = setScopesInUrl(tab.url, [...currentScopes, scope]);
  await new Promise((resolve, reject) => {
    chrome.tabs.update(tab.id, { url: nextUrl }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0] || null);
    });
  });
}

function getScopesFromUrl(url) {
  try {
    const parsed = new URL(url);
    const scope = parsed.searchParams.get("scope");
    if (!scope) return [];

    return scope
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function setScopesInUrl(url, scopes) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.searchParams);

  params.delete("scope");
  params.append("scope", [...new Set(scopes)].join(" "));

  parsed.search = params.toString();
  return parsed.toString();
}

function renderPauseState(paused) {
  pauseButton.textContent = paused ? "Re-Start Privacy Rewrites" : "Pause Privacy Rewrites";
  pauseButton.classList.toggle("paused", paused);

  pauseStatus.textContent = paused
    ? "Rewrites Disabled - Be careful!"
    : "Rewrites Enabled - You're safe!";
  pauseStatus.classList.toggle("disabled", paused);
  pauseStatus.classList.toggle("enabled", !paused);
}

function makeIcon(kind, text, title) {
  const span = document.createElement("span");
  span.className = `icon ${kind}`;
  span.textContent = text;
  span.title = title;
  return span;
}

function showError(error) {
  if (!errorBanner) return;

  const message = error instanceof Error ? error.message : String(error);
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}


