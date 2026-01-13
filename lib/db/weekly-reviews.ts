import { createClient } from '../supabase/server'
import { TablesInsert, TablesUpdate } from '../database.types'

/**
 * 주간 리뷰 관련 데이터베이스 함수
 */

export async function getWeeklyReview(userId: string, weeklyPlanId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('weekly_plan_id', weeklyPlanId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116은 "no rows returned" 에러
    throw error
  }
  return data
}

export async function upsertWeeklyReview(
  userId: string,
  weeklyPlanId: string,
  review: Omit<TablesInsert<'weekly_reviews'>, 'user_id' | 'weekly_plan_id'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_reviews')
    .upsert(
      {
        ...review,
        user_id: userId,
        weekly_plan_id: weeklyPlanId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'weekly_plan_id',
      }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 주간 통계 계산
 * - 완료율: 완료된 작업 / 전체 작업
 * - 프로젝트별 완료 수
 */
export async function getWeeklyStats(userId: string, weeklyPlanId: string) {
  const supabase = await createClient()

  // 주간 계획 아이템 가져오기
  const { data: items, error: itemsError } = await supabase
    .from('weekly_plan_items')
    .select(`
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
    `)
    .eq('weekly_plan_id', weeklyPlanId)
    .eq('user_id', userId)

  if (itemsError) throw itemsError

  if (!items || items.length === 0) {
    return {
      completionRatio: 0,
      totalTasks: 0,
      completedTasks: 0,
      completionsByProject: {},
    }
  }

  const totalTasks = items.length
  const completedTasks = items.filter(
    (item) => item.tasks && (item.tasks as any).is_done === true
  ).length

  // 프로젝트별 완료 수 계산
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

  return {
    completionRatio: totalTasks > 0 ? completedTasks / totalTasks : 0,
    totalTasks,
    completedTasks,
    completionsByProject,
  }
}
