import { createClient } from '../supabase/server'
import { TablesInsert, TablesUpdate } from '../database.types'

/**
 * 프로젝트 관련 데이터베이스 함수
 */

export async function getProjects(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProject(userId: string, projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

export async function createProject(userId: string, project: TablesInsert<'projects'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(
  userId: string,
  projectId: string,
  updates: TablesUpdate<'projects'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteProject(userId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId)

  if (error) throw error
}
