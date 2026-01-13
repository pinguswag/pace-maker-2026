'use client'

import { hasSupabaseEnv } from '@/lib/supabase/client'

export default function EnvCheck({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-4 text-red-600">설정 필요</h1>
          <p className="text-gray-700 mb-6">
            Supabase 환경 변수가 설정되지 않았습니다. 배포 환경에서는 Vercel 대시보드에서 환경 변수를 설정해야 합니다.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-2">로컬 개발 환경 설정:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm mb-4">
              <li>프로젝트 루트에 <code className="bg-white px-1 py-0.5 rounded">.env.local</code> 파일 생성</li>
              <li>다음 변수들을 추가하세요:</li>
            </ol>
            <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs mb-4">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here`}
            </pre>
            <h2 className="font-semibold mb-2 mt-6">Vercel 배포 환경 설정:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Vercel 대시보드
                </a>
                에서 프로젝트 선택
              </li>
              <li>Settings → Environment Variables 메뉴로 이동</li>
              <li>다음 환경 변수들을 추가:
                <ul className="list-disc list-inside ml-4 mt-2">
                  <li><code className="bg-white px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
                  <li><code className="bg-white px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                </ul>
              </li>
              <li>환경 변수 추가 후 프로젝트를 다시 배포하세요</li>
            </ol>
            <p className="mt-4 text-sm text-gray-600">
              Supabase 프로젝트 설정은{' '}
              <a
                href="https://supabase.com/dashboard/project/_/settings/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                여기
              </a>
              에서 확인할 수 있습니다.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>참고:</strong> 로컬 개발 시에는 파일을 생성한 후 개발 서버를 재시작하세요. 
              Vercel 배포 시에는 환경 변수 설정 후 재배포가 필요합니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
