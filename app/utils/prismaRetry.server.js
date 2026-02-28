export async function prismaRetry(fn, { retries = 5, baseDelayMs = 500 } = {}) {
  let lastErr;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const msg = String(err?.message || "");
      const transient =
        msg.includes("P1001") ||
        msg.toLowerCase().includes("can't reach database server") ||
        msg.toLowerCase().includes("connection terminated") ||
        msg.toLowerCase().includes("timeout");

      // If it's not a transient DB issue, or we used all retries, fail normally
      if (!transient || i === retries - 1) throw err;

      // exponential backoff: 500ms, 1s, 2s, 4s, 8s...
      const wait = baseDelayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  throw lastErr;
}