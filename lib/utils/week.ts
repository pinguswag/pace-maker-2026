/**
 * 주간 계획 관련 유틸리티 함수
 */

/**
 * 주의 시작일(월요일)을 계산
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 월요일로 조정
  return new Date(d.setDate(diff))
}

/**
 * 주 키 생성 (YYYY-ww 형식, ISO 8601 주 번호 사용)
 * 예: "2026-01-15" -> "2026-03"
 * 
 * ISO 8601 주 번호 규칙:
 * - 주는 월요일에 시작
 * - 연도의 첫 번째 주는 1월 4일이 포함된 주
 */
export function getWeekKey(date: Date = new Date()): string {
  const weekStart = getWeekStart(date)
  const year = weekStart.getFullYear()
  
  // ISO 8601 주 번호 계산
  // 1월 4일이 항상 첫 번째 주에 포함됨
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay() || 7 // 일요일을 7로 변환
  const jan4WeekStart = new Date(jan4)
  jan4WeekStart.setDate(jan4.getDate() - jan4Day + 1) // 월요일로 조정
  
  const weekStartTime = weekStart.getTime()
  const jan4WeekStartTime = jan4WeekStart.getTime()
  const daysDiff = Math.floor((weekStartTime - jan4WeekStartTime) / (1000 * 60 * 60 * 24))
  const weekNumber = Math.floor(daysDiff / 7) + 1
  
  return `${year}-${String(weekNumber).padStart(2, '0')}`
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayKey(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}
