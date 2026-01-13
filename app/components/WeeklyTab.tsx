'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { getWeekKey, getWeekStart } from '@/lib/utils/week'
import type { Database } from '@/lib/database.types'

type WeeklyPlanItem = Database['public']['Tables']['weekly_plan_items']['Row'] & {
  tasks: Database['public']['Tables']['tasks']['Row'] & {
    projects: Database['public']['Tables']['projects']['Row']
  }
}

type Task = Database['public']['Tables']['tasks']['Row'] & {
  projects: Database['public']['Tables']['projects']['Row']
}

// SortableItem 컴포넌트
function SortableItem({
  item,
  onPickForToday,
  onRemove,
}: {
  item: WeeklyPlanItem
  onPickForToday: (id: string) => void
  onRemove: (id: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const task = item.tasks as any
  const project = task?.projects as any

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg ${
        isDragging ? 'bg-gray-100 shadow-lg' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* 드래그 핸들 */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
          aria-label="Drag to reorder"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none"
          >
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-medium">{task?.title}</div>
          {project && <div className="text-sm text-gray-500">{project.name}</div>}
        </div>
      </div>
      <div className="flex gap-2">
        {!item.picked_for_today && (
          <button
            onClick={() => onPickForToday(item.id)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            오늘로 선택
          </button>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
        >
          제거
        </button>
      </div>
    </div>
  )
}

// 드래그 오버레이 아이템
function DragOverlayItem({ item }: { item: WeeklyPlanItem }) {
  const task = item.tasks as any
  const project = task?.projects as any

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-xl opacity-90">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-gray-400 p-1">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="7" cy="5" r="1.5" />
            <circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" />
            <circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" />
            <circle cx="13" cy="15" r="1.5" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-medium">{task?.title}</div>
          {project && <div className="text-sm text-gray-500">{project.name}</div>}
        </div>
      </div>
    </div>
  )
}

export default function WeeklyTab() {
  const [weeklyItems, setWeeklyItems] = useState<WeeklyPlanItem[]>([])
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [weeklyPlanId, setWeeklyPlanId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 활성 아이템 찾기
  const activeItem = useMemo(() => {
    if (!activeId) return null
    return weeklyItems.find((item) => item.id === activeId) || null
  }, [activeId, weeklyItems])

  useEffect(() => {
    let isMounted = true
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('WeeklyTab load timeout')
        setLoading(false)
      }
    }, 15000) // 15초 타임아웃

    loadData().finally(() => {
      if (isMounted) {
        clearTimeout(timeoutId)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  async function loadData() {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('Auth error in WeeklyTab:', authError)
      setLoading(false)
      return
    }

    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // 현재 주간 계획 가져오기 또는 생성
      const weekKey = getWeekKey()
      let { data: weeklyPlan } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_key', weekKey)
        .single()

      if (!weeklyPlan) {
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

        weeklyPlan = newPlan
      }

      if (weeklyPlan) {
        setWeeklyPlanId(weeklyPlan.id)

        // 주간 계획 아이템 가져오기
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
          .eq('weekly_plan_id', weeklyPlan.id)
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true })

        if (items) {
          setWeeklyItems(items as WeeklyPlanItem[])
        }

        // 백로그 작업 가져오기 (주간 계획에 없는 작업들)
        const { data: allTasks } = await supabase
          .from('tasks')
          .select(
            `
            *,
            projects (*)
          `
          )
          .eq('user_id', user.id)
          .eq('is_done', false)

        if (allTasks) {
          const itemTaskIds = new Set(items?.map((item) => item.task_id) || [])
          const backlog = allTasks.filter((task) => !itemTaskIds.has(task.id))
          setBacklogTasks(backlog as Task[])
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // 에러 발생 시에도 로딩 상태 해제
    } finally {
      setLoading(false)
    }
  }

  async function addToWeek(taskId: string) {
    if (!weeklyPlanId) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      // 중복 체크
      const { data: existing } = await supabase
        .from('weekly_plan_items')
        .select('id')
        .eq('weekly_plan_id', weeklyPlanId)
        .eq('task_id', taskId)
        .single()

      if (existing) {
        // 이미 추가된 작업이면 무시
        return
      }

      // 최대 sort_order 찾기
      const { data: items } = await supabase
        .from('weekly_plan_items')
        .select('sort_order')
        .eq('weekly_plan_id', weeklyPlanId)
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextSortOrder = items && items.length > 0 ? items[0].sort_order + 1 : 0

      await supabase.from('weekly_plan_items').insert({
        user_id: user.id,
        weekly_plan_id: weeklyPlanId,
        task_id: taskId,
        sort_order: nextSortOrder,
      })

      await loadData()
    } catch (error: any) {
      // Unique constraint violation은 무시 (이미 추가된 경우)
      if (error?.code === '23505') {
        console.log('Task already in weekly plan')
        return
      }
      console.error('Error adding task to week:', error)
    }
  }

  async function pickForToday(itemId: string) {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    try {
      await supabase
        .from('weekly_plan_items')
        .update({
          picked_for_today: true,
          picked_date: today,
        })
        .eq('id', itemId)

      await loadData()
    } catch (error) {
      console.error('Error picking for today:', error)
    }
  }

  async function removeFromWeek(itemId: string) {
    const supabase = createClient()

    try {
      await supabase.from('weekly_plan_items').delete().eq('id', itemId)
      await loadData()
    } catch (error) {
      console.error('Error removing from week:', error)
    }
  }

  // 드래그 시작
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  // 드래그 종료 - 변경된 항목만 업데이트
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const oldIndex = weeklyItems.findIndex((item) => item.id === active.id)
    const newIndex = weeklyItems.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null)
      return
    }

    // 로컬 상태 업데이트 (즉시 반영)
    const newItems = arrayMove(weeklyItems, oldIndex, newIndex)
    setWeeklyItems(newItems)
    setActiveId(null)

    // 변경된 항목만 찾아서 업데이트
    // 각 항목의 이전 sort_order와 새 sort_order를 비교
    const changedItems: Array<{ id: string; newSortOrder: number }> = []

    // 이동 범위 내의 항목들 확인
    const startIndex = Math.min(oldIndex, newIndex)
    const endIndex = Math.max(oldIndex, newIndex)

    for (let i = startIndex; i <= endIndex; i++) {
      const newItem = newItems[i]
      const previousItem = weeklyItems.find((item) => item.id === newItem.id)

      // 이전 sort_order와 새 sort_order가 다르면 변경된 것으로 간주
      if (previousItem && previousItem.sort_order !== i) {
        changedItems.push({
          id: newItem.id,
          newSortOrder: i,
        })
      }
    }

    // 변경된 항목이 없으면 DB 업데이트 불필요
    if (changedItems.length === 0) {
      return
    }

    // 배치 업데이트
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      // 각 항목을 개별적으로 업데이트 (Supabase는 배치 업데이트를 직접 지원하지 않음)
      // 하지만 Promise.all을 사용하여 병렬 처리
      await Promise.all(
        changedItems.map(({ id, newSortOrder }) =>
          supabase
            .from('weekly_plan_items')
            .update({
              sort_order: newSortOrder,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id)
        )
      )
    } catch (error) {
      console.error('Error updating sort order:', error)
      // 에러 발생 시 원래 상태로 복구
      await loadData()
    }
  }

  // 드래그 취소
  function handleDragCancel() {
    setActiveId(null)
  }

  if (loading) {
    return <div className="p-4">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      {/* 주간 계획 목록 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">이번 주</h2>
        {weeklyItems.length === 0 ? (
          <p className="text-gray-500">아직 이번 주 계획에 항목이 없습니다.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={weeklyItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {weeklyItems.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onPickForToday={pickForToday}
                    onRemove={removeFromWeek}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeItem ? <DragOverlayItem item={activeItem} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* 백로그 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">백로그</h2>
        {backlogTasks.length === 0 ? (
          <p className="text-gray-500">백로그 작업이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {backlogTasks.map((task) => {
              const project = task.projects as any
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{task.title}</div>
                    {project && (
                      <div className="text-sm text-gray-500">{project.name}</div>
                    )}
                  </div>
                  <button
                    onClick={() => addToWeek(task.id)}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    이번 주에 추가
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
