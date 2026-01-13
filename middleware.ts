import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 세션 업데이트 (Supabase SSR)
  return await updateSession(request)
  
  // Note: 인증 체크는 각 페이지 컴포넌트에서 수행합니다.
  // 미들웨어에서는 세션 쿠키만 업데이트합니다.
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청 경로와 일치:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘)
     * - public 폴더의 파일들
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
