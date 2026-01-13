'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'
import { createClient } from '@/lib/supabase/client'
import { getWeekKey, getWeekStart } from '@/lib/utils/week'
import type { Database } from '@/lib/database.types'

type WeeklyPlan = Database['public']['Tables']['weekly_plans']['Row']
type WeeklyReview = Database['public']['Tables']['weekly_reviews']['Row']

export default function ReviewPage() {
  const router = useRouter()
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null)
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [stats, setStats] = useState({
    completionRatio: 0,
    totalTasks: 0,
    completedTasks: 0,
    completionsByProject: {} as Record<string, { name: string; count: number }>,
  })
  const [whatWorked, setWhatWorked] = useState('')
  const [whatBlocked, setWhatBlocked] = useState('')
  const [nextWeekFocus, setNextWeekFocus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
      } else {
        setAuthChecked(true)
        loadReviewData()
      }
    }

    checkAuth()
  }, [router])

  async function loadReviewData() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setLoading(true)

    try {
      const weekKey = getWeekKey()

      // 현재 주간 계획 가져오기
      let { data: plan } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_key', weekKey)
        .single()

      if (!plan) {
        // 주간 계획이 없으면 생성
        const weekStart = getWeekStart()
        const { data: newPlan } = await supabase
          .from('weekly_plans')
          .insert({
            user_id: user.id,
            week_key: weekKey,
            week_start_date: weekStart.toISOString().split('T')[0],
          })
          .select()
          .single()

        plan = newPlan
      }

      if (plan) {
        setWeeklyPlan(plan)

        // 주간 리뷰 가져오기
        const { data: reviewData } = await supabase
          .from('weekly_reviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('weekly_plan_id', plan.id)
          .single()

        if (reviewData) {
          setReview(reviewData)
          setWhatWorked(reviewData.what_worked || '')
          setWhatBlocked(reviewData.what_blocked || '')
          setNextWeekFocus(reviewData.next_week_focus || '')
        }

        // 통계 계산
        const { data: items } = await supabase
          .from('weekly_plan_items')
          .select(
            `
            task_id,
            tasks (
              id,
              is_done,
              project_id,
              projects (
                id,
                name
              )
            )
          `
          )
          .eq('weekly_plan_id', plan.id)
          .eq('user_id', user.id)

        if (items) {
          const totalTasks = items.length
          const completedTasks = items.filter(
            (item) => item.tasks && (item.tasks as any).is_done === true
          ).length

          const completionsByProject: Record<string, { name: string; count: number }> = {}
          items.forEach((item) => {
            const task = item.tasks as any
            if (task && task.is_done && task.projects) {
              const project = task.projects as any
              const projectId = project.id
              const projectName = project.name

              if (!completionsByProject[projectId]) {
                completionsByProject[projectId] = { name: projectName, count: 0 }
              }
              completionsByProject[projectId].count++
            }
          })

          setStats({
            completionRatio: totalTasks > 0 ? completedTasks / totalTasks : 0,
            totalTasks,
            completedTasks,
            completionsByProject,
          })
        }
      }
    } catch (error) {
      console.error('Error loading review data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveReview() {
    if (!weeklyPlan) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setSaving(true)

    try {
      const { error } = await supabase.from('weekly_reviews').upsert(
        {
          user_id: user.id,
          weekly_plan_id: weeklyPlan.id,
          what_worked: whatWorked || null,
          what_blocked: whatBlocked || null,
          next_week_focus: nextWeekFocus || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'weekly_plan_id',
        }
      )

      if (error) throw error

      alert('리뷰가 성공적으로 저장되었습니다!')
      await loadReviewData()
    } catch (error) {
      console.error('Error saving review:', error)
      alert('리뷰 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4">로딩 중...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">주간 리뷰</h1>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">이번 주 통계</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">완료율</span>
                <span className="font-semibold">
                  {Math.round(stats.completionRatio * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${stats.completionRatio * 100}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {stats.totalTasks}개 중 {stats.completedTasks}개 완료
            </div>
            {Object.keys(stats.completionsByProject).length > 0 && (
              <div>
                <h3 className="font-medium mb-2">프로젝트별 완료 수</h3>
                <div className="space-y-1">
                  {Object.entries(stats.completionsByProject).map(([projectId, data]) => (
                    <div key={projectId} className="flex justify-between text-sm">
                      <span>{data.name}</span>
                      <span className="font-medium">{data.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 리뷰 폼 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">회고</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="what-worked"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                잘된 점
              </label>
              <textarea
                id="what-worked"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이번 주에 잘된 점은 무엇인가요?"
              />
            </div>
            <div>
              <label
                htmlFor="what-blocked"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                막힌 점
              </label>
              <textarea
                id="what-blocked"
                value={whatBlocked}
                onChange={(e) => setWhatBlocked(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="이번 주에 막힌 점은 무엇인가요?"
              />
            </div>
            <div>
              <label
                htmlFor="next-week-focus"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                다음 주 집중할 점
              </label>
              <textarea
                id="next-week-focus"
                value={nextWeekFocus}
                onChange={(e) => setNextWeekFocus(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="다음 주에 집중할 점은 무엇인가요?"
              />
            </div>
            <button
              onClick={handleSaveReview}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '리뷰 저장'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
