// GET /api/meta-stats?days=14  - env: META_ACCESS_TOKEN (ads_read), META_AD_ACCOUNT_ID
module.exports = async (req, res) => {
  try {
    const days = Math.min(90, parseInt(req.query.days || '14', 10)), id = String(process.env.META_AD_ACCOUNT_ID || '').replace(/^act_/, '');
    if (!id || !process.env.META_ACCESS_TOKEN) return res.status(400).json({ error: 'META env missing' });
    const iso = (d) => d.toISOString().slice(0, 10), ok = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || ''), until = ok(req.query.end) ? new Date(req.query.end) : new Date(), since = ok(req.query.start) ? new Date(req.query.start) : new Date(Date.now() - (days - 1) * 864e5);
    const q = async (extra) => {
      const p = new URLSearchParams(Object.assign({ access_token: process.env.META_ACCESS_TOKEN, time_range: JSON.stringify({ since: iso(since), until: iso(until) }), fields: 'spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions', limit: '100' }, extra));
      const r = await fetch('https://graph.facebook.com/v20.0/act_' + id + '/insights?' + p), j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message); return j.data || [];
    };
    const act = (r, ...t) => { const a = (r.actions || []).find((x) => t.includes(x.action_type)); return a ? Number(a.value) : 0; };
    const LEAD = ['lead', 'offsite_conversion.fb_pixel_lead'], n = Number;
    const [sm, dy, cp, pl, dg] = await Promise.all([q({}), q({ time_increment: '1' }), q({ level: 'campaign', fields: 'campaign_name,spend,impressions,clicks,inline_link_clicks,actions' }), q({ breakdowns: 'publisher_platform', fields: 'spend' }), q({ breakdowns: 'age,gender', fields: 'spend,actions' })]);
    const s = sm[0] || {};
    const NAMES = { landing_page_view: 'landing_page_view', 'offsite_conversion.fb_pixel_view_content': 'ViewContent', 'offsite_conversion.fb_pixel_add_to_cart': 'AddToCart', 'offsite_conversion.fb_pixel_initiate_checkout': 'InitiateCheckout', 'offsite_conversion.fb_pixel_lead': 'Lead', lead: 'Lead (Meta)', link_click: 'link_click' };
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      summary: { spend: n(s.spend || 0), impressions: n(s.impressions || 0), reach: n(s.reach || 0), clicks: n(s.inline_link_clicks || s.clicks || 0), ctr: n(s.ctr || 0), cpc: n(s.cpc || 0), cpm: n(s.cpm || 0), frequency: n(s.frequency || 0), leads: act(s, ...LEAD) },
      daily: dy.map((r) => ({ date: r.date_start.replace(/-/g, ''), spend: n(r.spend), impressions: n(r.impressions), clicks: n(r.inline_link_clicks || r.clicks || 0), leads: act(r, ...LEAD) })),
      campaigns: cp.map((r) => ({ name: r.campaign_name, spend: n(r.spend), impressions: n(r.impressions), clicks: n(r.inline_link_clicks || r.clicks || 0), leads: act(r, ...LEAD) })).sort((a, b) => b.spend - a.spend).slice(0, 8),
      demographics: dg.map((r) => ({ age: r.age, gender: r.gender, spend: n(r.spend), leads: act(r, ...LEAD) })),
      platforms: pl.map((r) => ({ name: r.publisher_platform, spend: n(r.spend) })),
      actions: (s.actions || []).filter((x) => NAMES[x.action_type]).map((x) => ({ name: NAMES[x.action_type], count: n(x.value) })),
    });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
