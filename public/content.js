let isSelecting = false;
let startX, startY, selectionBox;

// Listen to messages from side panel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    const action = msg?.action || msg?.type;
    if (action === "startLasso") {
      console.log("content.js [action]", msg.action)
      enableLasso();
      sendResponse({ ok: true });
      return true;
    }
  } catch (err) {
    console.error(err);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    const action = msg?.action || msg?.type
    if (action === "removeLasso") {
      console.log("content.js [action]", msg.action)
      removeLasso()
      sendResponse({ ok: true })
    }
  } catch (err) {
    console.error(err)
  }
})

function enableLasso() {
  document.addEventListener("mousedown", startSelection);
  document.addEventListener("keydown", handleEscape)
}

function removeLasso() {
  document.removeEventListener("mousedown", startSelection);
  document.removeEventListener("mousemove", resizeSelection);
  document.removeEventListener("mouseup", finishSelection);
  document.removeEventListener("keydown", handleEscape);

  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
  isSelecting = false;
}

function handleEscape(e) {
  if (e.key === "Escape") {
    console.log("content.js [removing] removeLasso");
    removeLasso();
  }
}

function startSelection(e) {
  if (e.button !== 0) return; // only left-click
  isSelecting = true;

  startX = e.pageX;
  startY = e.pageY;

  selectionBox = document.createElement("div");
  selectionBox.style.position = "absolute";
  selectionBox.style.border = "2px dashed #00f";
  selectionBox.style.background = "rgba(0, 0, 255, 0.1)";
  selectionBox.style.left = `${startX}px`;
  selectionBox.style.top = `${startY}px`;
  selectionBox.style.zIndex = 999999;
  document.body.appendChild(selectionBox);

  document.addEventListener("mousemove", resizeSelection);
  document.addEventListener("mouseup", finishSelection);
}

function resizeSelection(e) {
  if (!isSelecting) return;
  selectionBox.style.width = `${Math.abs(e.pageX - startX)}px`;
  selectionBox.style.height = `${Math.abs(e.pageY - startY)}px`;
  selectionBox.style.left = `${Math.min(e.pageX, startX)}px`;
  selectionBox.style.top = `${Math.min(e.pageY, startY)}px`;
}


async function finishSelection(e) {
  isSelecting = false;

  const rect = selectionBox.getBoundingClientRect();
  console.log("Selection rect", rect);

  const allElements = document.body.querySelectorAll("*");
  const selectedElements = [];

  for (const el of allElements) {
    const box = el.getBoundingClientRect();

    // Skip invisible elements
    if (box.width === 0 || box.height === 0) continue;

    // Check overlap between selection box and element
    const overlaps =
      !(rect.right < box.left ||
        rect.left > box.right ||
        rect.bottom < box.top ||
        rect.top > box.bottom);

    if (overlaps) {
      selectedElements.push(el);
      console.log("Selected element:", el.tagName, el);
    }
  }

  // Send back a preview of selected elements
  chrome.runtime.sendMessage({
    action: "selectionDone",
    elements: selectedElements.map((el) => el.outerHTML.slice(0, 200)),
    rect
  });

  selectionBox.remove();
  document.removeEventListener("mousemove", resizeSelection);
  document.removeEventListener("mouseup", finishSelection);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action !== "AI" || !msg.response) return;

  console.log("content [action]", msg.action);

  let responseStr = msg.response;

  // Strip markdown backticks if AI wrapped JSON in ```json
  responseStr = responseStr.trim().replace(/^```json\s*/, "").replace(/```$/, "").trim();

  let response
  try {
    response = JSON.parse(responseStr);
  } catch (error) {
    console.error("Failed to parse AI response as JSON:", responseStr, error);
    return;
  }

  const { identifier: className, modifiedHtml } = response;

  if (!className || !modifiedHtml) {
    console.warn("AI response missing identifier or modifiedHtml:", response);
    return;
  }

  console.log("Replacing element(s) with class:", className);

  // Split className into individual classes
  const classList = className.trim().split(/\s+/);

  // Find elements that contain all classes (regardless of order)
  const elements = Array.from(document.querySelectorAll("*")).filter(el =>
    classList.every(cls => el.classList.contains(cls))
  );

  if (!elements.length) {
    console.warn("No element found for class:", className);
    return;
  }

  // Replace all matching elements
  elements.forEach(el => {
    el.outerHTML = modifiedHtml;
  });

  console.log(`Replaced ${elements.length} element(s) successfully.`);
  sendResponse({ message: "Elements replaced successfully", ok: true })
});

