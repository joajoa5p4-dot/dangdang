// 공개 콘텐츠(settings/basic, reviews, faqs, details)를 Firestore REST로 읽어 Vercel CDN에 캐시합니다.
// 방문자가 아무리 많아도 Firestore 읽기는 캐시 만료(5분)마다 1회분만 발생합니다.
// 환경변수: FIREBASE_PROJECT_ID
const dec = (v) => {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dec(x)]));
  return null;
};
const doc = (d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, dec(v)])) });

export default async function handler(req, res) {
  const P = process.env.FIREBASE_PROJECT_ID;
  if (!P) return res.status(500).json({ error: 'FIREBASE_PROJECT_ID missing' });
  const base = `https://firestore.googleapis.com/v1/projects/${P}/databases/(default)/documents`;
  try {
    const list = async (c) => {
      const out = []; let t = '';
      do { const r = await fetch(`${base}/${c}?pageSize=300${t ? '&pageToken=' + t : ''}`); if (!r.ok) throw new Error(c + ' ' + r.status); const j = await r.json(); (j.documents || []).forEach((d) => out.push(doc(d))); t = j.nextPageToken || ''; } while (t);
      return out;
    };
    const [b, reviews, faqs, details] = await Promise.all([
      fetch(`${base}/settings/basic`).then((r) => (r.ok ? r.json() : null)),
      list('reviews'), list('faqs'), list('details'),
    ]);
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ basic: b ? doc(b) : null, reviews, faqs, details });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
