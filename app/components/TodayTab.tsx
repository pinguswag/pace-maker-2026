'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

type TodayItem = Database['public']['Tables']['weekly_plan_items']['Row'] & {
  tasks: Database['public']['Tables']['tasks']['Row'] & {
    projects: Database['public']['Tables']['projects']['Row']
  }
}

export default function TodayTab() {
  const [todayItems, setTodayItems] = useState<TodayItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('TodayTab load timeout')
        setLoading(false)
      }
    }, 15000) // 15초 타임아웃

    loadTodayItems().finally(() => {
      if (isMounted) {
        clearTimeout(timeoutId)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  async function loadTodayItems() {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in TodayTab:', authError)
      setLoading(false)
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: items } = await supabase
        .from('weekly_plan_items')
        .select(
          `
          *,
          tasks (
            *,
            projects (*)
          )
        `
        )
        .eq('user_id', user.id)
        .eq('picked_for_today', true)
        .eq('picked_date', today)
        .order('sort_order', { ascending: true })

      if (items) {
        setTodayItems(items as TodayItem[])
      }
    } catch (error) {
      console.error('Error loading today items:', error)
      // 에러 발생 시에도 로딩 상태 해제
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(itemId: string, taskId: string, currentIsDone: boolean) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      const now = new Date().toISOString()

      if (currentIsDone) {
        // 완료 해제: is_done을 false로, done_at을 null로
        await supabase
          .from('tasks')
          .update({
            is_done: false,
            done_at: null,
            updated_at: now,
          })
          .eq('id', taskId)
          .eq('user_id', user.id)

        // 완료 해제 로그 추가 (선택사항)
        const { error: logError } = await supabase
          .from('task_logs')
          .insert({
            user_id: user.id,
            task_id: taskId,
            action: 'uncomplete',
            // occurred_at과 occurred_date는 DB 기본값 사용
          })

        // Unique constraint violation은 무시
        if (logError && logError.code !== '23505') {
          throw logError
        }
      } else {
        // 완료 처리: is_done을 true로, done_at을 현재 시간으로
        await supabase
          .from('tasks')
          .update({
            is_done: true,
            done_at: now,
            updated_at: now,
          })
          .eq('id', taskId)
          .eq('user_id', user.id)

        // 완료 로그 추가 (DB 기본값 사용, unique constraint로 중복 방지)
        const { error: logError } = await supabase
          .from('task_logs')
          .insert({
            user_id: user.id,
            task_id: taskId,
            action: 'complete',
            // occurred_at과 occurred_date는 명시하지 않음 - DB 기본값 사용
          })

        // Unique constraint violation은 무시 (이미 오늘 로그가 있는 경우)
        if (logError && logError.code !== '23505') {
          throw logError
        }
      }

      // 목록 새로고침
      await loadTodayItems()
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  if (loading) {
    return <div className="p-4">로딩 중...</div>
  }

  if (todayItems.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-500">오늘 선택된 항목이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {todayItems.map((item) => {
        const task = item.tasks as any
        const project = task?.projects as any
        const isDone = task?.is_done === true

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between p-4 border rounded-lg ${
              isDone ? 'bg-gray-50 opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => handleToggle(item.id, item.task_id, isDone)}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className={`font-medium ${isDone ? 'line-through' : ''}`}>
                  {task?.title}
                </div>
                {project && (
                  <div className="text-sm text-gray-500">{project.name}</div>
                )}
                {task?.notes && (
                  <div className="text-sm text-gray-400 mt-1">{task.notes}</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
