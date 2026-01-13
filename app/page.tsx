'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from './components/Navigation'
import WeeklyTab from './components/WeeklyTab'
import TodayTab from './components/TodayTab'
import EnvCheck from './components/EnvCheck'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'weekly' | 'today'>('weekly')
  const [authChecked, setAuthChecked] = useState(false)
  const [projectCount, setProjectCount] = useState(0)
  const [taskCount, setTaskCount] = useState(0)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    let isMounted = true
    const timeoutId = setTimeout(() => {
      if (isMounted && !authChecked) {
        console.warn('Auth check timeout - proceeding anyway')
        setAuthChecked(true)
        setLoadingData(false)
      }
    }, 10000) // 10초 타임아웃

    async function checkAuth() {
      if (!hasSupabaseEnv()) {
        console.warn('Supabase environment variables not available')
        if (isMounted) {
          setAuthChecked(true) // 환경 변수가 없어도 UI는 표시
          setLoadingData(false)
        }
        return
      }

      try {
        const supabase = createClient()
        
        // 타임아웃이 있는 Promise로 감싸기
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 8000)
        )
        
        const {
          data: { user },
          error: authError,
        } = await Promise.race([authPromise, timeoutPromise]) as any

        if (!isMounted) return

        if (authError) {
          console.error('Auth error:', authError)
          // 인증 에러가 발생하면 로그인 페이지로
          router.push('/login')
          return
        }

        if (!user) {
          router.push('/login')
        } else {
          setAuthChecked(true)
          await loadCounts(user.id)
        }
      } catch (error: any) {
        console.error('Auth check error:', error)
        if (isMounted) {
          // 타임아웃이나 네트워크 에러 시에도 UI는 표시
          if (error?.message === 'Auth timeout' || error?.message?.includes('network')) {
            setAuthChecked(true)
            setLoadingData(false)
          } else {
            // 다른 에러는 로그인 페이지로
            router.push('/login')
          }
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    checkAuth()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [router])

  async function loadCounts(userId: string) {
    const supabase = createClient()
    setLoadingData(true)

    try {
      // 프로젝트 개수 확인
      const { count: projectCountData } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active')

      // 작업 개수 확인
      const { count: taskCountData } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      setProjectCount(projectCountData || 0)
      setTaskCount(taskCountData || 0)
    } catch (error) {
      console.error('Error loading counts:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (!hasSupabaseEnv()) {
    return <EnvCheck>{null}</EnvCheck>
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  const showEmptyState = !loadingData && projectCount === 0

  return (
    <EnvCheck>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Empty State 가이드 */}
          {showEmptyState && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    페이스 메이커 시작하기
                  </h2>
                  <p className="text-gray-600 mb-4">
                    프로젝트를 만들어 작업을 시작해보세요.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/projects/new"
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      첫 프로젝트 만들기
                    </Link>
                    <Link
                      href="/guide"
                      className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                    >
                      전체 가이드 보기
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                    activeTab === 'weekly'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  주간 계획
                </button>
                <button
                  onClick={() => setActiveTab('today')}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                    activeTab === 'today'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  오늘
                </button>
              </nav>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            {activeTab === 'weekly' ? <WeeklyTab /> : <TodayTab />}
          </div>
        </main>
      </div>
    </EnvCheck>
  )
}
