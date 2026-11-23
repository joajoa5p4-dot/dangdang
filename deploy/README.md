# 당당폰 배포 가이드

## 구성
- `Dangdangphone.dc.html` : 사용자 화면(모바일) + `/admin` 관리자 화면(PC)
- `api/capi.js` Meta CAPI · `api/sheets.js` 구글시트 실시간 입력 · `api/ga-stats.js` GA4 통계
- `vercel.json` : `/admin` 숨김 라우팅 · `firestore.rules` : 규칙 예시

## 1. 설정값 (`window.DDP_CONFIG` 또는 파일 상단 `cfg`)
`firebase{apiKey,authDomain,projectId,appId}`, `GTM_ID`, `GA4_ID`, `PIXEL_ID`
- GTM 사용 시 GA4 태그는 GTM 안에서 구성(중복 설치 방지: GTM이 있으면 gtag 직접 설치 안 함)
- 이벤트(dataLayer): `page_view_spa`, `scroll_10/25/50/75/90/100`, `cta_click`, `view_item`, `generate_lead`, `consultation_submit` + UTM/소재ID(`utm_content`/`ad_id`/`creative_id`)
- 동의: 기본 거부(Consent Mode v2) → 동의 시 GTM/Pixel 활성화

## 2. Vercel 환경변수
`META_PIXEL_ID`, `META_CAPI_TOKEN`, (`META_TEST_CODE`), `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`
- 서비스계정 이메일을 GA4 속성(뷰어) / 구글시트(편집자)에 추가

## 3. Firestore 컬렉션
`settings/basic`, `settings/admin`, `reviews/*`, `faqs/*`, `details/*`, `leads/*` (항목별 개별 문서)

## 4. 관리자
`/admin` · 초기 계정 `admin / admin1234` (관리자 설정에서 변경 후 저장하기)
