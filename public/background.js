// set default side-panel open
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  })
})

// send page screenshot
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "selectionDone") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      // send screenshot + rect to popup
      console.log("Sending to client", dataUrl)
      chrome.runtime.sendMessage({
        action: "tabScreenshot",
        dataUrl: dataUrl,
        rect: msg.rect
      });
    });
  }
});

