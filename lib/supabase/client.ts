import { createBrowserClient } from '@supabase/ssr'
import { Database } from '../database.types'

/**
 * 환경 변수 확인
 */
export function hasSupabaseEnv(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * 브라우저에서 사용할 Supabase 클라이언트
 * 클라이언트 컴포넌트에서 사용
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // 환경 변수가 없어도 클라이언트를 생성 (실제 사용 시 에러 발생)
  // 이렇게 하면 앱이 크래시하지 않고, 사용하는 곳에서 에러를 처리할 수 있음
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
