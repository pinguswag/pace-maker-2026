'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../../components/Navigation'
import DeleteProjectModal from '../../components/DeleteProjectModal'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']
type Task = Database['public']['Tables']['tasks']['Row']

export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')

  useEffect(() => {
    loadProject()
    loadTasks()
  }, [projectId])

  async function loadProject() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
    }
  }

  async function loadTasks() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setTasks(data)
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteProject() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id)

      if (error) throw error

      router.push('/projects')
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('프로젝트 삭제에 실패했습니다.')
    }
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault()

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      if (editingTask) {
        // 업데이트
        const { error } = await supabase
          .from('tasks')
          .update({
            title: taskTitle,
            notes: taskNotes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTask.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // 생성
        const { error } = await supabase.from('tasks').insert({
          user_id: user.id,
          project_id: projectId,
          title: taskTitle,
          notes: taskNotes || null,
        })

        if (error) throw error
      }

      setShowTaskForm(false)
      setEditingTask(null)
      setTaskTitle('')
      setTaskNotes('')
      await loadTasks()
    } catch (error) {
      console.error('Error saving task:', error)
      alert('작업 저장에 실패했습니다.')
    }
  }

  function startEditTask(task: Task) {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskNotes(task.notes || '')
    setShowTaskForm(true)
  }

  function cancelTaskForm() {
    setShowTaskForm(false)
    setEditingTask(null)
    setTaskTitle('')
    setTaskNotes('')
  }

  async function handleDeleteTask(taskId: string) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)

      if (error) throw error

      await loadTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('작업 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4">로딩 중...</div>
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4">프로젝트를 찾을 수 없습니다.</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/projects" className="text-blue-500 hover:underline mb-2 block">
              ← 프로젝트 목록으로
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {(() => {
                const totalTasks = tasks.length
                const completedTasks = tasks.filter((t) => t.is_done).length
                const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                return (
                  <span className="text-sm text-gray-500 font-medium">
                    [{completionRate}% ({completedTasks}/{totalTasks})]
                  </span>
                )
              })()}
            </div>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTaskForm(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              새 작업
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              프로젝트 삭제
            </button>
          </div>
        </div>

        {/* 작업 폼 */}
        {showTaskForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingTask ? '작업 수정' : '새 작업'}
            </h2>
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  id="task-title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="task-notes" className="block text-sm font-medium mb-1">
                  메모
                </label>
                <textarea
                  id="task-notes"
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingTask ? '수정' : '생성'}
                </button>
                <button
                  type="button"
                  onClick={cancelTaskForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 작업 목록 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">작업</h2>
          {tasks.length === 0 ? (
            <p className="text-gray-500">아직 작업이 없습니다. 첫 작업을 만들어보세요!</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    task.is_done ? 'bg-gray-50 opacity-60' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className={`font-medium ${task.is_done ? 'line-through' : ''}`}>
                      {task.title}
                    </div>
                    {task.notes && (
                      <div className="text-sm text-gray-500 mt-1">{task.notes}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditTask(task)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 삭제 확인 모달 */}
        {showDeleteModal && (
          <DeleteProjectModal
            projectName={project.name}
            onConfirm={handleDeleteProject}
            onCancel={() => setShowDeleteModal(false)}
          />
        )}
      </main>
    </div>
  )
}
