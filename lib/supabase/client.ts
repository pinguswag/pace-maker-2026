import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

/**
 * 환경 변수 확인
 */
export function hasSupabaseEnv(): boolean {
  // Next.js는 NEXT_PUBLIC_ 변수를 빌드 타임에 번들에 포함시킴
  // 모바일 브라우저에서도 접근 가능
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return !!(url && key && url.trim().length > 0 && key.trim().length > 0)
}

/**
 * 브라우저에서 사용할 Supabase 클라이언트
 * 클라이언트 컴포넌트에서 사용
 * @supabase/ssr이 자동으로 쿠키를 처리하므로 추가 설정 불필요
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // 환경 변수가 없어도 클라이언트를 생성 (실제 사용 시 에러 발생)
  // 이렇게 하면 앱이 크래시하지 않고, 사용하는 곳에서 에러를 처리할 수 있음
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
