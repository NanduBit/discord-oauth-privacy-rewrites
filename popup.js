import { DO_NOT_DISABLE, OAUTH_SCOPES, PLEASE_DISABLE } from "./lib/scopes.js";
import { rewriteActiveTab } from "./lib/rewrite-url.js";
import { getPaused, getScopeSettings, setPaused, setScopeDisabled } from "./lib/storage.js";

const scopesRoot = document.getElementById("scopes");
const errorBanner = document.getElementById("error-banner");
const pauseButton = document.getElementById("pause-button");
const pauseStatus = document.getElementById("pause-status");

init().catch(showError);

async function init() {
  if (!scopesRoot || !pauseButton || !pauseStatus || !errorBanner) {
    throw new Error("Popup did not initialize correctly.");
  }

  const settings = await getScopeSettings();
  renderScopeGrid(settings);

  const paused = await getPaused();
  renderPauseState(paused);

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
      } catch (error) {
        showError(error);
      }
    });

    label.appendChild(input);
    label.appendChild(name);

    if (DO_NOT_DISABLE.includes(scope)) {
      label.appendChild(makeIcon("ban", "No", "Disabling this may break apps"));
    }

    if (PLEASE_DISABLE.includes(scope)) {
      label.appendChild(makeIcon("warn", "!", "Please disable this for privacy"));
    }

    fragment.appendChild(label);
  }

  scopesRoot.innerHTML = "";
  scopesRoot.appendChild(fragment);
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
