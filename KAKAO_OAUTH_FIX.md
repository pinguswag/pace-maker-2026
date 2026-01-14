# 카카오톡 OAuth 로그인 문제 해결 가이드

## 수정 사항

### 1. OAuth 콜백 라우트 개선 (`app/auth/callback/route.ts`)
- 에러 처리 강화
- URL 파싱 안정성 개선
- 카카오톡 인앱 브라우저 호환성 개선

### 2. 로그인 페이지 개선 (`app/login/page.tsx`)
- OAuth 에러 메시지 표시
- Suspense boundary 추가 (Next.js 요구사항)
- 카카오톡 인앱 브라우저 리다이렉트 URL 개선

## Supabase 대시보드 설정 확인

카카오톡 OAuth가 제대로 작동하려면 **Supabase 대시보드**에서 리다이렉트 URL이 올바르게 설정되어 있어야 합니다.

### 설정 방법

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Authentication** → **URL Configuration** 메뉴로 이동
4. **Redirect URLs**에 다음 URL들을 추가:
   ```
   https://your-domain.com/auth/callback
   https://your-domain.vercel.app/auth/callback
   ```
   (실제 배포된 도메인으로 변경)

5. **Site URL**도 확인:
   ```
   https://your-domain.com
   ```

### 카카오톡 개발자 콘솔 설정

카카오톡 OAuth를 사용하려면 **카카오톡 개발자 콘솔**에서도 설정이 필요합니다:

1. [카카오톡 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 선택
3. **플랫폼 설정** → **Web 플랫폼** 추가
4. **사이트 도메인** 등록:
   ```
   https://your-domain.com
   https://your-domain.vercel.app
   ```

5. **카카오 로그인** → **Redirect URI** 설정:
   ```
   https://xnrvomjrppljjlhsidjt.supabase.co/auth/v1/callback
   ```
   (Supabase가 자동으로 처리하므로 Supabase의 콜백 URL 사용)

## 문제 해결

### "requested path is invalid" 에러

이 에러는 보통 다음 중 하나의 원인입니다:

1. **Supabase 리다이렉트 URL 미설정**
   - Supabase 대시보드에서 `/auth/callback` URL이 등록되어 있는지 확인

2. **카카오톡 인앱 브라우저 URL 파싱 문제**
   - 코드에서 이미 개선했지만, 여전히 문제가 있으면 브라우저 콘솔 확인

3. **도메인 불일치**
   - 배포된 도메인과 Supabase에 등록된 도메인이 일치하는지 확인

### 디버깅 방법

1. **모바일 브라우저 콘솔 확인**
   - Chrome: USB 디버깅 사용
   - Safari: Settings → Advanced → Web Inspector

2. **네트워크 탭 확인**
   - OAuth 리다이렉트 요청이 실패하는지 확인
   - 401, 403, CORS 에러 확인

3. **Supabase 로그 확인**
   - Supabase 대시보드 → Logs → Auth Logs
   - OAuth 요청 실패 원인 확인

## 테스트 체크리스트

- [ ] Supabase 대시보드에서 리다이렉트 URL 설정 확인
- [ ] 카카오톡 개발자 콘솔에서 도메인 설정 확인
- [ ] 일반 브라우저에서 카카오 로그인 테스트
- [ ] 카카오톡 인앱 브라우저에서 카카오 로그인 테스트
- [ ] 에러 메시지가 사용자에게 표시되는지 확인
