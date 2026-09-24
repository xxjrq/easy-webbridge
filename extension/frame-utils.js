export function scriptTarget(tabId, frameId) {
  if (frameId === undefined) return { tabId };
  if (!Number.isSafeInteger(frameId) || frameId < 0) {
    throw new Error("frameId must be a non-negative safe integer");
  }
  return { tabId, frameIds: [frameId] };
}

export function scriptResult(results) {
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No frame was injected; the target may have navigated or is inaccessible");
  }
  return results[0].result;
}

export function frameResult(result, frameId) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Frame-targeted command did not return an object result");
  }
  return { ...result, frameId: frameId ?? 0 };
}

function safeOrigin(urlValue) {
  try {
    const url = new URL(urlValue);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export function publicFrames(frames) {
  return frames.map(({ frameId, parentFrameId, url }) => ({
    frameId,
    parentFrameId,
    origin: safeOrigin(url),
  }));
}
