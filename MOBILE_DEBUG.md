# 모바일 디버깅 가이드

## 모바일에서 기능이 작동하지 않는 경우

### 가능한 원인

1. **환경 변수 문제**
   - Vercel에 환경 변수가 제대로 설정되지 않음
   - 빌드 타임에 환경 변수가 포함되지 않음

2. **쿠키/세션 문제**
   - 모바일 브라우저의 쿠키 정책
   - SameSite 쿠키 설정
   - HTTPS 필수 (Secure 쿠키)

3. **네트워크 문제**
   - CORS 설정
   - Supabase 프로젝트 설정

### 디버깅 방법

#### 1. 브라우저 콘솔 확인
모바일 브라우저에서 개발자 도구를 열고 콘솔 에러 확인:
- Chrome: `chrome://inspect` (USB 디버깅)
- Safari: Settings → Advanced → Web Inspector

#### 2. 환경 변수 확인
브라우저 콘솔에서:
```javascript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set')
```

#### 3. 네트워크 요청 확인
- Network 탭에서 Supabase API 요청 확인
- 401, 403 에러 확인
- CORS 에러 확인

### 해결 방법

#### Vercel 환경 변수 확인
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 다음 변수들이 Production, Preview, Development 모두에 설정되어 있는지 확인:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. 환경 변수 추가 후 재배포

#### Supabase 설정 확인
1. Supabase 대시보드 → Authentication → URL Configuration
2. Redirect URLs에 다음 추가:
   - `https://your-domain.vercel.app/auth/callback`
   - `https://your-domain.vercel.app/**` (와일드카드)

#### 모바일 브라우저 테스트
- 실제 모바일 기기에서 테스트
- 모바일 브라우저의 개발자 도구 사용
- 네트워크 탭에서 요청 확인
