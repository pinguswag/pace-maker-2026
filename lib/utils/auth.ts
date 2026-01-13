import { createClient } from '../supabase/server'
import { redirect } from 'next/navigation'

/**
 * 현재 사용자 정보를 가져옵니다
 * 인증되지 않은 경우 null을 반환합니다
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * 인증된 사용자만 허용합니다
 * 인증되지 않은 경우 로그인 페이지로 리다이렉트합니다
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}
