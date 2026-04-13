import { rewriteUrl } from "./lib/rewrite-url.js";

chrome.tabs.onCreated.addListener((tab) => {
  void rewriteUrl(tab);
});

chrome.tabs.onUpdated.addListener((_id, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  void rewriteUrl(tab);
});
