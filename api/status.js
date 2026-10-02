// Checks whether a way on the switchboard is answering. The browser can't read
// another site's response, so it can't tell a working app from a deleted
// deployment's error page — this can.
//
//   GET /api/status?url=https://example.vercel.app  ->  { "up": true, "code": 200 }
//
// Addresses that only make sense from the viewer's own machine (localhost and
// private networks) come back as { "up": null } so the browser checks them itself.

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|.*\.local$)/i;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  let target;
  try {
    target = new URL(String((req.query && req.query.url) || ""));
  } catch (e) {
    return res.status(400).json({ error: "bad url" });
  }
  if (!/^https?:$/.test(target.protocol)) return res.status(400).json({ error: "bad url" });
  if (PRIVATE.test(target.hostname)) return res.status(200).json({ up: null });

  try {
    const r = await fetch(target, {
      redirect: "follow",
      headers: { "user-agent": "Proline-Switchboard/1.0" },
      signal: AbortSignal.timeout(7000)
    });
    // A login wall still means the app is up.
    const up = r.status < 400 || r.status === 401 || r.status === 403;
    return res.status(200).json({ up, code: r.status });
  } catch (e) {
    return res.status(200).json({ up: false, code: 0 });
  }
};
