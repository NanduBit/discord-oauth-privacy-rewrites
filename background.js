import { rewriteUrl } from "./lib/rewrite-url.js";

chrome.tabs.onCreated.addListener((tab) => {
  void rewriteUrl(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (typeof changeInfo.url === "string") {
    void rewriteUrl({ id: tabId, url: changeInfo.url });
    return;
  }

  if (changeInfo.status === "loading") {
    void rewriteUrl(tab);
  }
});
