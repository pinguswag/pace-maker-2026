/**
 * 날짜 포맷팅 유틸리티 함수
 */

/**
 * 한국어 주 레이블 생성
 * 예: "2026년 3주차 (01/12 ~ 01/18)"
 */
export function formatKoreanWeekLabel(
  weekStartDate: string,
  weekKey: string
): string {
  const start = new Date(weekStartDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6) // 주의 마지막 날 (일요일)

  const year = start.getFullYear()
  const weekNumber = weekKey.split('-')[1] // "2026-03" -> "03"

  const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}/${day}`
  }

  return `${year}년 ${parseInt(weekNumber)}주차 (${formatDate(start)} ~ ${formatDate(end)})`
}
