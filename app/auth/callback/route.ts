import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const error = requestUrl.searchParams.get('error')
    const errorDescription = requestUrl.searchParams.get('error_description')
    
    // 에러가 있으면 로그인 페이지로 리다이렉트
    if (error) {
      console.error('OAuth error:', error, errorDescription)
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', error || 'oauth_error')
      if (errorDescription) {
        loginUrl.searchParams.set('error_description', errorDescription)
      }
      return NextResponse.redirect(loginUrl)
    }

    // 코드가 없으면 홈으로 리다이렉트
    if (!code) {
      console.warn('No OAuth code in callback')
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }

    // 세션 교환
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Session exchange error:', exchangeError)
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'session_exchange_failed')
      return NextResponse.redirect(loginUrl)
    }

    // 성공 시 홈으로 리다이렉트
    return NextResponse.redirect(new URL('/', requestUrl.origin))
  } catch (error: any) {
    console.error('Callback route error:', error)
    // 에러 발생 시에도 홈으로 리다이렉트 (무한 루프 방지)
    try {
      const requestUrl = new URL(request.url)
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    } catch {
      // URL 파싱 실패 시 기본 리다이렉트
      return NextResponse.redirect(new URL('/', 'https://your-domain.com'))
    }
  }
}
