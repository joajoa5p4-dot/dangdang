// POST /api/capi  - env: META_PIXEL_ID, META_CAPI_TOKEN, (선택) META_TEST_CODE
const crypto = require('crypto');
const h = (v) => (v ? crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex') : undefined);
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const b = req.body || {};
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
    const phone = String(b.phone || '').replace(/\D/g, '').replace(/^0/, '82');
    const user = { client_ip_address: ip, client_user_agent: req.headers['user-agent'], fbp: b.fbp, fbc: b.fbc, ph: phone ? [h(phone)] : undefined, fn: b.name ? [h(b.name)] : undefined, external_id: b.external_id ? [h(b.external_id)] : undefined, country: [h('kr')] };
    Object.keys(user).forEach((k) => user[k] === undefined && delete user[k]);
    const payload = { data: [{ event_name: b.event_name, event_time: Math.floor(Date.now() / 1000), event_id: b.event_id, event_source_url: b.url, action_source: 'website', user_data: user, custom_data: b.custom || {} }] };
    if (process.env.META_TEST_CODE) payload.test_event_code = process.env.META_TEST_CODE;
    const r = await fetch('https://graph.facebook.com/v19.0/' + process.env.META_PIXEL_ID + '/events?access_token=' + process.env.META_CAPI_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    res.status(r.ok ? 200 : 400).json(await r.json());
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
