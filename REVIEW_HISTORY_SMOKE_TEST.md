# 주간 리뷰 히스토리 스모크 테스트

## 구현 완료 사항

### 1. 주간 선택기
- 최근 12주 주간 계획 목록 표시
- 한국어 주 레이블 형식: "2026년 3주차 (01/12 ~ 01/18)"
- 현재 주 자동 선택 (없으면 최신 주 선택)

### 2. 데이터 로딩
- 초기 로드 시 주간 계획 목록 및 현재 주 데이터 로드
- 주 변경 시 해당 주의 통계 및 리뷰 로드
- 주 변경 시 편집 모드 자동 해제

### 3. 통계 계산
- 선택된 주의 완료율, 총 작업 수, 완료 작업 수 계산
- 프로젝트별 완료 수 집계
- `tasks.is_done` 기준으로 완료 여부 판단

### 4. 읽기/편집 모드
- 리뷰가 있으면 읽기 모드로 시작
- 리뷰가 없으면 빈 상태로 시작
- "수정" 버튼으로 편집 모드 전환
- "취소" 버튼으로 원래 값 복원

## 스모크 테스트 체크리스트

### 테스트 1: 주간 선택기 표시 및 현재 주 선택
**UI 단계:**
1. `/review` 페이지 접근
2. 주간 선택기 드롭다운이 표시되는지 확인
3. 현재 주가 자동으로 선택되어 있는지 확인
4. 드롭다운을 열어 최근 12주 목록이 표시되는지 확인
5. 각 주의 레이블이 "YYYY년 N주차 (MM/DD ~ MM/DD)" 형식인지 확인

**검증 SQL:**
```sql
-- 최근 12주 주간 계획 확인
SELECT 
  id,
  week_key,
  week_start_date,
  (week_start_date + INTERVAL '6 days') as week_end_date
FROM weekly_plans
WHERE user_id = '<your_user_id>'
ORDER BY week_start_date DESC
LIMIT 12;
```

**예상 결과:**
- 최근 12주가 표시됨
- 현재 주가 자동 선택됨
- 한국어 레이블 형식이 올바름

---

### 테스트 2: 이전 주 리뷰 읽기
**UI 단계:**
1. `/review` 페이지 접근
2. 주간 선택기에서 이전 주 선택 (리뷰가 있는 주)
3. 해당 주의 통계가 표시되는지 확인
4. 저장된 리뷰가 읽기 모드로 표시되는지 확인
5. "잘된 점", "막힌 점", "다음 주 집중할 점"이 각각 카드로 표시되는지 확인
6. 줄바꿈이 유지되는지 확인

**검증 SQL:**
```sql
-- 선택한 주의 리뷰 확인
SELECT 
  wr.*,
  wp.week_key,
  wp.week_start_date
FROM weekly_reviews wr
JOIN weekly_plans wp ON wp.id = wr.weekly_plan_id
WHERE wr.user_id = '<your_user_id>'
  AND wr.weekly_plan_id = '<selected_weekly_plan_id>';
```

**예상 결과:**
- 이전 주의 리뷰가 읽기 모드로 표시됨
- 모든 필드가 올바르게 표시됨
- 줄바꿈이 유지됨

---

### 테스트 3: 이전 주 리뷰 수정
**UI 단계:**
1. 이전 주 리뷰가 표시된 상태에서 "수정" 버튼 클릭
2. 편집 모드로 전환되는지 확인
3. 텍스트 영역에 기존 내용이 표시되는지 확인
4. 내용을 수정
5. "리뷰 저장" 클릭
6. 저장 후 읽기 모드로 전환되는지 확인
7. 수정된 내용이 반영되었는지 확인

**검증 SQL:**
```sql
-- 수정된 리뷰 확인
SELECT 
  what_worked,
  what_blocked,
  next_week_focus,
  updated_at
FROM weekly_reviews
WHERE user_id = '<your_user_id>'
  AND weekly_plan_id = '<selected_weekly_plan_id>';
```

**예상 결과:**
- 수정된 내용이 저장됨
- `updated_at`이 최신 시간으로 업데이트됨
- 읽기 모드에서 수정된 내용이 표시됨

---

### 테스트 4: 새 주 리뷰 작성
**UI 단계:**
1. 주간 선택기에서 리뷰가 없는 주 선택
2. 빈 상태 메시지와 "리뷰 작성하기" 버튼이 표시되는지 확인
3. "리뷰 작성하기" 버튼 클릭 (또는 자동으로 편집 모드로 전환)
4. 리뷰 내용 입력
5. "리뷰 저장" 클릭
6. 저장 후 읽기 모드로 전환되고 내용이 표시되는지 확인

**검증 SQL:**
```sql
-- 새로 생성된 리뷰 확인
SELECT 
  id,
  weekly_plan_id,
  what_worked,
  what_blocked,
  next_week_focus,
  created_at,
  updated_at
FROM weekly_reviews
WHERE user_id = '<your_user_id>'
  AND weekly_plan_id = '<selected_weekly_plan_id>';
```

**예상 결과:**
- 새 리뷰가 생성됨
- `created_at`과 `updated_at`이 설정됨
- 읽기 모드에서 내용이 표시됨

---

### 테스트 5: 주 변경 시 편집 모드 해제
**UI 단계:**
1. 한 주를 선택하고 편집 모드로 전환
2. 내용을 수정하지 않고 다른 주 선택
3. 편집 모드가 자동으로 해제되고 선택한 주의 데이터가 로드되는지 확인
4. 원래 주로 돌아가면 수정하지 않은 원래 내용이 유지되는지 확인

**예상 결과:**
- 주 변경 시 편집 모드가 자동 해제됨
- 선택한 주의 데이터가 올바르게 로드됨
- 이전 주의 수정하지 않은 내용이 유지됨

---

### 테스트 6: 통계 계산 정확성
**UI 단계:**
1. 여러 주를 선택하며 통계 확인
2. 각 주의 통계가 올바르게 계산되는지 확인
3. 프로젝트별 완료 수가 정확한지 확인

**검증 SQL:**
```sql
-- 선택한 주의 통계 수동 계산
SELECT 
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE t.is_done = true) as completed_tasks,
  ROUND(
    COUNT(*) FILTER (WHERE t.is_done = true)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as completion_percentage
FROM weekly_plan_items wpi
JOIN tasks t ON t.id = wpi.task_id
WHERE wpi.weekly_plan_id = '<selected_weekly_plan_id>'
  AND wpi.user_id = '<your_user_id>';

-- 프로젝트별 완료 수
SELECT 
  p.name,
  COUNT(*) as completed_count
FROM weekly_plan_items wpi
JOIN tasks t ON t.id = wpi.task_id
JOIN projects p ON p.id = t.project_id
WHERE wpi.weekly_plan_id = '<selected_weekly_plan_id>'
  AND wpi.user_id = '<your_user_id>'
  AND t.is_done = true
GROUP BY p.id, p.name;
```

**예상 결과:**
- UI의 통계와 SQL 계산 결과가 일치함
- 프로젝트별 완료 수가 정확함

---

## 엣지 케이스 테스트

### 엣지 케이스 1: 주간 계획이 없는 경우
- 현재 주의 주간 계획이 없으면 자동 생성
- 생성된 계획이 선택됨

### 엣지 케이스 2: 리뷰가 있지만 모든 필드가 비어있는 경우
- "아직 작성된 리뷰가 없습니다" 메시지 표시
- "리뷰 작성하기" 버튼 표시

### 엣지 케이스 3: 주 변경 중 로딩 상태
- 주 변경 시 로딩 상태 표시
- 데이터 로드 완료 후 UI 업데이트

---

## 모든 테스트 통과 기준

- [x] 주간 선택기가 올바르게 표시됨
- [x] 현재 주가 자동 선택됨
- [x] 이전 주 리뷰를 읽을 수 있음
- [x] 이전 주 리뷰를 수정할 수 있음
- [x] 새 주 리뷰를 작성할 수 있음
- [x] 주 변경 시 편집 모드가 해제됨
- [x] 통계가 정확하게 계산됨
- [x] 한국어 레이블이 올바르게 표시됨
