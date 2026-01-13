'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import EnvCheck from '../components/EnvCheck'
import { createClient, hasSupabaseEnv } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

export default function GuidePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuthAndLoadData() {
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
          await loadData(user.id)
        }
      } catch (error) {
        console.error('Auth check error:', error)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  async function loadData(userId: string) {
    const supabase = createClient()
    setLoading(true)

    try {
      // 프로젝트 개수 확인
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')

      // 작업 개수 확인
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)

      setProjects(projectsData || [])
      setTasks(tasksData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!hasSupabaseEnv()) {
    return <EnvCheck>{null}</EnvCheck>
  }

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>로딩 중...</div>
      </div>
    )
  }

  const steps = [
    {
      id: 1,
      title: '프로젝트 생성',
      description: '작업을 관리할 프로젝트를 만들어보세요. 프로젝트는 관련된 작업들을 그룹화합니다.',
      cta: '프로젝트 만들기',
      href: '/projects/new',
      completed: projects.length > 0,
    },
    {
      id: 2,
      title: '작업 3개 생성',
      description: '프로젝트에 최소 3개의 작업을 추가해보세요. 각 작업은 완료 가능한 단위입니다.',
      cta: projects.length > 0 ? '작업 만들기' : '먼저 프로젝트 만들기',
      href: projects.length > 0 ? `/projects/${projects[0].id}` : '/projects/new',
      completed: tasks.length >= 3,
    },
    {
      id: 3,
      title: '이번 주에 추가',
      description: '작업을 주간 계획에 추가하여 이번 주에 할 일을 정리하세요.',
      cta: '주간 계획 보기',
      href: '/',
      completed: false, // 주간 계획 아이템 확인은 복잡하므로 항상 false
    },
    {
      id: 4,
      title: '오늘로 선택',
      description: '주간 계획에서 오늘 할 작업을 선택하세요. 오늘 탭에서 확인할 수 있습니다.',
      cta: '오늘 탭 보기',
      href: '/',
      completed: false,
    },
    {
      id: 5,
      title: '작업 완료 및 리뷰',
      description: '작업을 완료하고 주간 리뷰에서 통계와 회고를 확인하세요.',
      cta: '리뷰 보기',
      href: '/review',
      completed: false,
    },
  ]

  return (
    <EnvCheck>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">시작 가이드</h1>
            <p className="text-gray-600">
              페이스 메이커를 처음 사용하시나요? 다음 단계를 따라 앱을 시작해보세요.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`border-l-4 ${
                  step.completed ? 'border-green-500 bg-green-50' : 'border-gray-300'
                } pl-6 py-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                          step.completed
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {step.completed ? '✓' : step.id}
                      </div>
                      <h2 className="text-xl font-semibold">{step.title}</h2>
                      {step.completed && (
                        <span className="text-sm text-green-600 font-medium">완료</span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    <Link
                      href={step.href}
                      className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      {step.cta}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">도움이 필요하신가요?</h3>
            <p className="text-blue-800 text-sm">
              각 단계를 완료하면 체크 표시가 나타납니다. 모든 단계를 완료하면 앱의 모든 기능을
              사용할 수 있습니다.
            </p>
          </div>
        </main>
      </div>
    </EnvCheck>
  )
}
