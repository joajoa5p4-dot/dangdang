// GET /api/ga-stats?days=14  - env: GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_JSON (GA4 속성에 '뷰어'로 추가)
const { getToken } = require('./_google');
module.exports = async (req, res) => {
  try {
    const days = Math.min(90, parseInt(req.query.days || '14', 10));
    const ok = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || ''), dr = [ok(req.query.start) && ok(req.query.end) ? { startDate: req.query.start, endDate: req.query.end } : { startDate: days + 'daysAgo', endDate: 'today' }];
    const t = await getToken('https://www.googleapis.com/auth/analytics.readonly');
    const D = (n) => ({ name: n }), top = (m, limit) => ({ metrics: [D(m)], limit, orderBys: [{ metric: { metricName: m }, desc: true }] });
    const run = async (requests) => {
      const r = await fetch('https://analyticsdata.googleapis.com/v1beta/properties/' + process.env.GA4_PROPERTY_ID + ':batchRunReports', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error && j.error.message); return j.reports || [];
    };
    const [a, b] = await Promise.all([run([
      { dateRanges: dr, dimensions: [D('date')], metrics: [D('sessions'), D('screenPageViews'), D('totalUsers')], orderBys: [{ dimension: { dimensionName: 'date' } }] },
      Object.assign({ dateRanges: dr, dimensions: [D('sessionSource'), D('sessionMedium')] }, top('sessions', 10)),
      Object.assign({ dateRanges: dr, dimensions: [D('eventName')] }, top('eventCount', 50)),
      Object.assign({ dateRanges: dr, dimensions: [D('sessionCampaignName'), D('sessionManualAdContent')] }, top('sessions', 10)),
      { dateRanges: dr, metrics: [D('averageSessionDuration'), D('engagementRate'), D('bounceRate')] },
    ]), run([
      Object.assign({ dateRanges: dr, dimensions: [D('deviceCategory')] }, top('sessions', 5)),
      Object.assign({ dateRanges: dr, dimensions: [D('region')] }, top('sessions', 8)),
      { dateRanges: dr, dimensions: [D('hour')], metrics: [D('sessions')], limit: 24 },
      Object.assign({ dateRanges: dr, dimensions: [D('newVsReturning')] }, top('sessions', 3)),
      Object.assign({ dateRanges: dr, dimensions: [D('sessionDefaultChannelGroup')] }, top('sessions', 8)),
    ])]);
    const rows = (rep, k) => ((rep[k] || {}).rows || []).map((x) => [...x.dimensionValues.map((d) => d.value), ...x.metricValues.map((m) => Number(m.value))]);
    const pg = await run([Object.assign({ dateRanges: dr, dimensions: [D('pagePath')] }, top('screenPageViews', 8)), Object.assign({ dateRanges: dr, dimensions: [D('userGender')] }, top('sessions', 4)), Object.assign({ dateRanges: dr, dimensions: [D('userAgeBracket')] }, top('sessions', 8)), Object.assign({ dateRanges: dr, dimensions: [D('operatingSystem')] }, top('sessions', 6))]);
    const tot = rows(a, 4)[0] || [];
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json({
      daily: rows(a, 0).map((x) => ({ date: x[0], sessions: x[1], pageviews: x[2], users: x[3] })),
      sources: rows(a, 1).map((x) => ({ source: x[0], medium: x[1], sessions: x[2] })),
      events: rows(a, 2).map((x) => ({ name: x[0], count: x[1] })),
      campaigns: rows(a, 3).map((x) => ({ campaign: x[0], content: x[1], sessions: x[2] })),
      totals: { avgDur: tot[0] || 0, engRate: tot[1] || 0, bounce: tot[2] || 0 },
      devices: rows(b, 0).map((x) => ({ device: x[0], sessions: x[1] })),
      regions: rows(b, 1).map((x) => ({ region: x[0], sessions: x[1] })),
      hours: rows(b, 2).map((x) => ({ hour: x[0], sessions: x[1] })),
      newret: rows(b, 3).map((x) => ({ type: x[0], sessions: x[1] })),
      channels: rows(b, 4).map((x) => ({ channel: x[0], sessions: x[1] })),
      genders: rows(pg, 1).map((x) => ({ gender: x[0], sessions: x[1] })),
      ages: rows(pg, 2).map((x) => ({ age: x[0], sessions: x[1] })).sort((a, b) => a.age.localeCompare(b.age)),
      os: rows(pg, 3).map((x) => ({ os: x[0], sessions: x[1] })),
      pages: rows(pg, 0).map((x) => ({ path: x[0], views: x[1] })),
    });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
