'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '../components/Navigation'
import { createClient } from '@/lib/supabase/client'
import { getWeekKey, getWeekStart } from '@/lib/utils/week'
import { formatKoreanWeekLabel } from '@/lib/utils/date'
import type { Database } from '@/lib/database.types'

type WeeklyPlan = Database['public']['Tables']['weekly_plans']['Row']
type WeeklyReview = Database['public']['Tables']['weekly_reviews']['Row']

export default function ReviewPage() {
  const router = useRouter()
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([])
  const [selectedWeeklyPlanId, setSelectedWeeklyPlanId] = useState<string | null>(null)
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
  const [isEditing, setIsEditing] = useState(false)

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
        await loadWeeklyPlans(user.id)
      }
    }

    checkAuth()
  }, [router])

  // 주간 계획 목록 로드
  async function loadWeeklyPlans(userId: string) {
    const supabase = createClient()
    setLoading(true)

    try {
      // 최근 12주 가져오기
      const { data: plans, error } = await supabase
        .from('weekly_plans')
        .select('id, week_key, week_start_date')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false })
        .limit(12)

      if (error) throw error

      if (plans && plans.length > 0) {
        setWeeklyPlans(plans)

        // 현재 주 찾기
        const currentWeekKey = getWeekKey()
        const currentPlan = plans.find((p) => p.week_key === currentWeekKey)

        // 현재 주가 없으면 가장 최근 주 선택
        const planToSelect = currentPlan || plans[0]
        setSelectedWeeklyPlanId(planToSelect.id)
        await loadReviewData(planToSelect.id)
      } else {
        // 주간 계획이 없으면 현재 주 생성
        const weekStart = getWeekStart()
        const weekKey = getWeekKey()
        const { data: newPlan } = await supabase
          .from('weekly_plans')
          .insert({
            user_id: userId,
            week_key: weekKey,
            week_start_date: weekStart.toISOString().split('T')[0],
          })
          .select()
          .single()

        if (newPlan) {
          setWeeklyPlans([newPlan])
          setSelectedWeeklyPlanId(newPlan.id)
          await loadReviewData(newPlan.id)
        }
      }
    } catch (error) {
      console.error('Error loading weekly plans:', error)
    } finally {
      setLoading(false)
    }
  }

  // 선택된 주의 리뷰 및 통계 로드
  async function loadReviewData(weeklyPlanId: string) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setLoading(true)

    try {
      // 주간 리뷰 가져오기
      const { data: reviewData } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('weekly_plan_id', weeklyPlanId)
        .single()

      if (reviewData) {
        setReview(reviewData)
        setWhatWorked(reviewData.what_worked || '')
        setWhatBlocked(reviewData.what_blocked || '')
        setNextWeekFocus(reviewData.next_week_focus || '')
        setIsEditing(false) // 리뷰가 있으면 읽기 모드로 시작
      } else {
        setReview(null)
        setWhatWorked('')
        setWhatBlocked('')
        setNextWeekFocus('')
        setIsEditing(false) // 리뷰가 없으면 빈 상태로 시작
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
        .eq('weekly_plan_id', weeklyPlanId)
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
      } else {
        setStats({
          completionRatio: 0,
          totalTasks: 0,
          completedTasks: 0,
          completionsByProject: {},
        })
      }
    } catch (error) {
      console.error('Error loading review data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 주 선택 변경 핸들러
  async function handleWeekChange(weeklyPlanId: string) {
    setSelectedWeeklyPlanId(weeklyPlanId)
    setIsEditing(false) // 주 변경 시 편집 모드 해제
    await loadReviewData(weeklyPlanId)
  }

  // 리뷰 저장
  async function handleSaveReview() {
    if (!selectedWeeklyPlanId) return

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
          weekly_plan_id: selectedWeeklyPlanId,
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
      setIsEditing(false) // 저장 후 읽기 모드로 전환
      await loadReviewData(selectedWeeklyPlanId)
    } catch (error) {
      console.error('Error saving review:', error)
      alert('리뷰 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 편집 취소
  function handleCancelEdit() {
    setIsEditing(false)
    // 원래 값으로 복원
    if (review) {
      setWhatWorked(review.what_worked || '')
      setWhatBlocked(review.what_blocked || '')
      setNextWeekFocus(review.next_week_focus || '')
    } else {
      setWhatWorked('')
      setWhatBlocked('')
      setNextWeekFocus('')
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

  const selectedPlan = weeklyPlans.find((p) => p.id === selectedWeeklyPlanId)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">주간 리뷰</h1>

        {/* 주간 선택기 */}
        {weeklyPlans.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <label htmlFor="week-selector" className="block text-sm font-medium text-gray-700 mb-2">
              주간 선택
            </label>
            <select
              id="week-selector"
              value={selectedWeeklyPlanId || ''}
              onChange={(e) => handleWeekChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {weeklyPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {formatKoreanWeekLabel(plan.week_start_date, plan.week_key)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 통계 */}
        {selectedPlan && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {selectedPlan.week_key === getWeekKey() ? '이번 주 통계' : '통계'}
            </h2>
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
        )}

        {/* 리뷰 섹션 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">회고</h2>
            {review && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                수정
              </button>
            )}
          </div>

          {isEditing ? (
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
              <div className="flex gap-3">
                <button
                  onClick={handleSaveReview}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '리뷰 저장'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </div>
          ) : review ? (
            <div className="space-y-6">
              {whatWorked && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">잘된 점</h3>
                  <div className="bg-gray-50 rounded-md p-4 text-gray-800 whitespace-pre-wrap">
                    {whatWorked}
                  </div>
                </div>
              )}
              {whatBlocked && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">막힌 점</h3>
                  <div className="bg-gray-50 rounded-md p-4 text-gray-800 whitespace-pre-wrap">
                    {whatBlocked}
                  </div>
                </div>
              )}
              {nextWeekFocus && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">다음 주 집중할 점</h3>
                  <div className="bg-gray-50 rounded-md p-4 text-gray-800 whitespace-pre-wrap">
                    {nextWeekFocus}
                  </div>
                </div>
              )}
              {!whatWorked && !whatBlocked && !nextWeekFocus && (
                <div className="text-center py-8 text-gray-500">
                  <p>아직 작성된 리뷰가 없습니다.</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    리뷰 작성하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>아직 작성된 리뷰가 없습니다.</p>
              <button
                onClick={() => setIsEditing(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                리뷰 작성하기
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
