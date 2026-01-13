import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '../database.types'

/**
 * 미들웨어에서 사용할 Supabase 클라이언트
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 환경 변수가 없으면 세션 업데이트를 건너뛰고 요청을 그대로 통과
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 새로고침
  try {
    await supabase.auth.getUser()
  } catch (error) {
    // 인증 오류는 무시하고 요청을 계속 진행
    console.error('Auth error in middleware:', error)
  }

  return supabaseResponse
}
