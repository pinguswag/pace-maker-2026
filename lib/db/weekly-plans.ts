import { createClient } from '../supabase/server'
import { getWeekStart, getWeekKey } from '../utils/week'
import { TablesInsert } from '../database.types'

/**
 * 주간 계획 관련 데이터베이스 함수
 */

/**
 * 현재 주의 주간 계획을 가져오거나 생성
 */
export async function getOrCreateCurrentWeekPlan(userId: string) {
  const supabase = await createClient()
  const weekKey = getWeekKey()
  const weekStart = getWeekStart()

  // 기존 계획 확인
  const { data: existing } = await supabase
    .from('weekly_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
    .single()

  if (existing) {
    return existing
  }

  // 새 계획 생성
  const { data, error } = await supabase
    .from('weekly_plans')
    .insert({
      user_id: userId,
      week_key: weekKey,
      week_start_date: weekStart.toISOString().split('T')[0],
    } as TablesInsert<'weekly_plans'>)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 주간 계획 아이템 가져오기 (작업 정보 포함)
 */
export async function getWeeklyPlanItems(userId: string, weeklyPlanId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_plan_items')
    .select(`
      *,
      tasks (
        id,
        title,
        notes,
        is_done,
        done_at,
        project_id,
        projects (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .eq('weekly_plan_id', weeklyPlanId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 주간 계획에 작업 추가
 */
export async function addTaskToWeeklyPlan(
  userId: string,
  weeklyPlanId: string,
  taskId: string
) {
  const supabase = await createClient()

  // 기존 아이템 확인
  const { data: existing } = await supabase
    .from('weekly_plan_items')
    .select('id')
    .eq('weekly_plan_id', weeklyPlanId)
    .eq('task_id', taskId)
    .single()

  if (existing) {
    return existing
  }

  // 최대 sort_order 찾기
  const { data: items } = await supabase
    .from('weekly_plan_items')
    .select('sort_order')
    .eq('weekly_plan_id', weeklyPlanId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextSortOrder = items && items.length > 0 ? items[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('weekly_plan_items')
    .insert({
      user_id: userId,
      weekly_plan_id: weeklyPlanId,
      task_id: taskId,
      sort_order: nextSortOrder,
    } as TablesInsert<'weekly_plan_items'>)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 주간 계획 아이템의 순서 업데이트
 */
export async function updateWeeklyPlanItemOrder(
  userId: string,
  itemId: string,
  newSortOrder: number
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_plan_items')
    .update({
      sort_order: newSortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 오늘 할 일로 선택
 */
export async function pickForToday(userId: string, itemId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('weekly_plan_items')
    .update({
      picked_for_today: true,
      picked_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 오늘 할 일에서 제거
 */
export async function unpickFromToday(userId: string, itemId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('weekly_plan_items')
    .update({
      picked_for_today: false,
      picked_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 오늘 할 일 목록 가져오기
 */
export async function getTodayItems(userId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('weekly_plan_items')
    .select(`
      *,
      tasks (
        id,
        title,
        notes,
        is_done,
        done_at,
        project_id,
        projects (
          id,
          name
        )
      )
    `)
    .eq('user_id', userId)
    .eq('picked_for_today', true)
    .eq('picked_date', today)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

/**
 * 주간 계획 아이템 삭제
 */
export async function removeFromWeeklyPlan(userId: string, itemId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('weekly_plan_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId)

  if (error) throw error
}
