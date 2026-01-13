import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              페이스 메이커
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                홈
              </Link>
              <Link
                href="/projects"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                프로젝트
              </Link>
              <Link
                href="/review"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                리뷰
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
