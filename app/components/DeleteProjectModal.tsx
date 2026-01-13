'use client'

import { useState } from 'react'

interface DeleteProjectModalProps {
  projectName: string
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteProjectModal({
  projectName,
  onConfirm,
  onCancel,
}: DeleteProjectModalProps) {
  const [step, setStep] = useState(1)
  const [confirmText, setConfirmText] = useState('')

  // 2단계 확인: 사용자가 프로젝트 이름을 입력해야 함
  const isStep2Valid = confirmText === projectName

  function handleFinalConfirm() {
    if (isStep2Valid) {
      onConfirm()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {step === 1 ? (
            <>
              <h2 className="text-xl font-bold mb-4">프로젝트 삭제</h2>
              <p className="text-gray-700 mb-6">
                이 프로젝트를 삭제하면 관련된 모든 작업, 이번 주/오늘 목록의 항목들, 그리고 완료 기록도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  계속
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4">삭제 확인</h2>
              <p className="text-gray-700 mb-4">
                확인을 위해 <strong>{projectName}</strong>을(를) 입력하세요:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={projectName}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={handleFinalConfirm}
                  disabled={!isStep2Valid}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  프로젝트 삭제
                </button>
                <button
                  onClick={() => {
                    setStep(1)
                    setConfirmText('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  뒤로
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
