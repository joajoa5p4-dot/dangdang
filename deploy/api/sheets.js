// POST {action:'init'|'append', sheetId, header?, row?}  - 서비스계정 이메일을 시트 편집자로 공유해야 합니다.
const { getToken } = require('./_google');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { action, sheetId, header, row } = req.body || {};
    const id = String(sheetId || '').replace(/.*\/d\/([^/]+).*/, '$1');
    if (!id) return res.status(400).json({ ok: false, error: 'sheetId required' });
    const t = await getToken('https://www.googleapis.com/auth/spreadsheets');
    const H = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' };
    const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/';
    if (action === 'init') {
      const cur = await (await fetch(base + 'A1:A1', { headers: H })).json();
      if (cur.error) return res.status(400).json({ ok: false, error: cur.error.message });
      if (!cur.values) {
        await fetch(base + 'A1?valueInputOption=RAW', { method: 'PUT', headers: H, body: JSON.stringify({ values: [header] }) });
      }
      return res.json({ ok: true });
    }
    if (action === 'append' && Array.isArray(row)) {
      const r = await fetch(base + 'A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS', { method: 'POST', headers: H, body: JSON.stringify({ values: [row] }) });
      const j = await r.json();
      return res.status(r.ok ? 200 : 400).json({ ok: r.ok, error: j.error && j.error.message });
    }
    res.status(400).json({ ok: false });
  } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
};
