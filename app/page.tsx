'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from './components/Navigation'
import WeeklyTab from './components/WeeklyTab'
import TodayTab from './components/TodayTab'
import EnvCheck from './components/EnvCheck'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'weekly' | 'today'>('weekly')
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      if (!hasSupabaseEnv()) {
        return
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
        } else {
          setAuthChecked(true)
        }
      } catch (error) {
        console.error('Auth check error:', error)
      }
    }

    checkAuth()
  }, [router])

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

  return (
    <EnvCheck>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
