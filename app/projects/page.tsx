'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '../components/Navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

type Project = Database['public']['Tables']['projects']['Row']

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
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
        loadProjects()
      }
    }

    checkAuth()
  }, [router])

  async function loadProjects() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setProjects(data)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
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
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">프로젝트</h1>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            새 프로젝트
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">아직 프로젝트가 없습니다. 첫 프로젝트를 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
                {project.description && (
                  <p className="text-gray-600 text-sm">{project.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
