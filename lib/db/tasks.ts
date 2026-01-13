import { createClient } from '../supabase/server'
import { TablesInsert, TablesUpdate } from '../database.types'

/**
 * 작업(Task) 관련 데이터베이스 함수
 */

export async function getTasksByProject(userId: string, projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTask(userId: string, taskId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createTask(userId: string, task: TablesInsert<'tasks'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: TablesUpdate<'tasks'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTask(userId: string, taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) throw error
}

/**
 * 작업 완료 처리
 * - tasks.is_done = true, done_at = now()
 * - task_logs에 완료 로그 추가
 */
export async function completeTask(userId: string, taskId: string) {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const today = now.split('T')[0]

  // 트랜잭션처럼 처리하기 위해 두 작업을 순차 실행
  // 1. 작업 완료 처리
  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      is_done: true,
      done_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .eq('user_id', userId)

  if (taskError) throw taskError

  // 2. 완료 로그 추가
  const { error: logError } = await supabase
    .from('task_logs')
    .insert({
      user_id: userId,
      task_id: taskId,
      action: 'complete',
      occurred_at: now,
      occurred_date: today,
    })

  if (logError) throw logError
}
