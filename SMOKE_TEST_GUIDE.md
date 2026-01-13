# Pace Maker 2026 - 스모크 테스트 가이드

## 사전 준비

1. **환경 변수 확인**: `.env.local` 파일이 올바르게 설정되어 있는지 확인
2. **개발 서버 실행**: `npm run dev`
3. **Supabase Table Editor 준비**: 각 단계 후 데이터를 확인할 수 있도록 준비

---

## 테스트 1: 프로젝트 및 작업 CRUD

### UI 단계

1. **로그인/회원가입**
   - `/login` 접근
   - 새 계정 생성 또는 기존 계정으로 로그인
   - 홈 페이지(`/`)로 리다이렉트 확인

2. **프로젝트 생성**
   - `/projects` 접근
   - "New Project" 클릭
   - 프로젝트 이름: `Test Project A`
   - 설명: `Test description`
   - "Create Project" 클릭
   - 프로젝트 목록에 표시되는지 확인

3. **프로젝트 상세 및 작업 생성**
   - 생성한 프로젝트 클릭
   - "New Task" 클릭
   - 작업 제목: `Task 1`
   - 메모: `First test task`
   - "Create Task" 클릭
   - 작업이 목록에 표시되는지 확인

4. **작업 수정**
   - 작업의 "Edit" 버튼 클릭
   - 제목을 `Task 1 Updated`로 변경
   - "Update Task" 클릭
   - 변경사항이 반영되는지 확인

5. **작업 삭제**
   - 다른 작업 생성: `Task 2`
   - "Delete" 버튼 클릭
   - 작업이 목록에서 제거되는지 확인

### 검증 SQL

```sql
-- 1. 프로젝트 확인
SELECT id, name, description, status, user_id, created_at
FROM projects
WHERE name = 'Test Project A'
ORDER BY created_at DESC
LIMIT 1;

-- 2. 작업 확인
SELECT id, title, notes, project_id, is_done, created_at
FROM tasks
WHERE project_id = (
  SELECT id FROM projects WHERE name = 'Test Project A' LIMIT 1
)
ORDER BY created_at DESC;

-- 3. 작업 수정 확인
SELECT id, title, notes, updated_at
FROM tasks
WHERE title = 'Task 1 Updated';

-- 4. 작업 삭제 확인 (Task 2가 없어야 함)
SELECT COUNT(*) as task2_count
FROM tasks
WHERE title = 'Task 2';
-- 결과: 0이어야 함
```

---

## 테스트 2: 주간 계획 자동 생성

### UI 단계

1. **주간 계획 자동 생성 확인**
   - `/` (Home - Weekly 탭) 접근
   - 주간 계획이 자동으로 생성되는지 확인
   - "This Week" 섹션이 표시되는지 확인

2. **Review 페이지에서도 자동 생성 확인**
   - `/review` 접근
   - 페이지가 정상 로드되는지 확인 (주간 계획이 없으면 자동 생성됨)

### 검증 SQL

```sql
-- 현재 주의 주간 계획 확인
-- 먼저 현재 주의 week_key 계산 필요
SELECT 
  id,
  user_id,
  week_key,
  week_start_date,
  created_at
FROM weekly_plans
WHERE user_id = '<your_user_id>'
  AND week_key = (
    -- 현재 주의 week_key (예: '2026-03')
    SELECT TO_CHAR(DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day', 'YYYY') || '-' || 
           LPAD(EXTRACT(WEEK FROM DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day')::text, 2, '0')
  )
ORDER BY created_at DESC
LIMIT 1;

-- 주간 계획이 정확히 1개만 있는지 확인
SELECT COUNT(*) as plan_count
FROM weekly_plans
WHERE user_id = '<your_user_id>'
  AND week_key = '<current_week_key>';
-- 결과: 1이어야 함
```

---

## 테스트 3: 주간 계획에 작업 추가 및 Today 선택

### UI 단계

1. **백로그에서 주간 계획에 추가**
   - `/` (Home - Weekly 탭) 접근
   - "Backlog" 섹션에서 작업 확인 (완료되지 않은 작업 중 주간 계획에 없는 것들)
   - 작업 옆의 "Add to This Week" 클릭
   - 작업이 "This Week" 섹션에 추가되는지 확인
   - 백로그에서 제거되는지 확인 (백로그는 주간 계획에 없는 완료되지 않은 작업만 표시)

2. **중복 추가 방지 테스트**
   - 같은 작업에 대해 "Add to This Week"를 다시 클릭
   - 에러 없이 처리되는지 확인 (DB 제약조건으로 보호됨)

3. **Today로 선택**
   - "This Week" 섹션의 작업 옆 "Pick for Today" 클릭
   - 버튼이 사라지는지 확인

4. **Today 탭 확인**
   - "Today" 탭 클릭
   - 선택한 작업이 표시되는지 확인
   - `picked_date = today` 필터링이 작동하는지 확인

### 검증 SQL

```sql
-- 1. 주간 계획 아이템 확인
SELECT 
  wpi.id,
  wpi.weekly_plan_id,
  wpi.task_id,
  wpi.sort_order,
  wpi.picked_for_today,
  wpi.picked_date,
  t.title as task_title,
  p.name as project_name
FROM weekly_plan_items wpi
JOIN tasks t ON t.id = wpi.task_id
JOIN projects p ON p.id = t.project_id
WHERE wpi.user_id = '<your_user_id>'
  AND wpi.weekly_plan_id = (
    SELECT id FROM weekly_plans 
    WHERE user_id = '<your_user_id>' 
      AND week_key = '<current_week_key>' 
    LIMIT 1
  )
ORDER BY wpi.sort_order;

-- 2. 중복 방지 확인 (unique_plan_task 제약조건)
-- 같은 weekly_plan_id와 task_id 조합이 1개만 있어야 함
SELECT 
  weekly_plan_id,
  task_id,
  COUNT(*) as count
FROM weekly_plan_items
WHERE user_id = '<your_user_id>'
GROUP BY weekly_plan_id, task_id
HAVING COUNT(*) > 1;
-- 결과: 0 rows (중복 없음)

-- 3. Today 선택 확인
SELECT 
  wpi.id,
  wpi.picked_for_today,
  wpi.picked_date,
  t.title,
  CASE 
    WHEN wpi.picked_date = CURRENT_DATE THEN 'Today'
    ELSE 'Other day'
  END as date_status
FROM weekly_plan_items wpi
JOIN tasks t ON t.id = wpi.task_id
WHERE wpi.user_id = '<your_user_id>'
  AND wpi.picked_for_today = true
  AND wpi.picked_date = CURRENT_DATE;
```

---

## 테스트 4: 작업 완료 및 로그 생성

### UI 단계

1. **작업 완료**
   - `/` (Home - Today 탭) 접근
   - 작업 옆의 체크박스 클릭
   - 작업이 완료 상태로 표시되는지 확인 (취소선, 회색 배경)
   - 체크박스가 체크된 상태로 유지되는지 확인

2. **완료된 작업이 Today 탭에 유지되는지 확인**
   - 완료된 작업이 Today 탭에서 사라지지 않고 표시되는지 확인

### 검증 SQL

```sql
-- 1. 작업 완료 상태 확인
SELECT 
  id,
  title,
  is_done,
  done_at,
  updated_at
FROM tasks
WHERE id = '<completed_task_id>';
-- is_done = true, done_at이 현재 시간 근처여야 함

-- 2. 작업 로그 확인
SELECT 
  id,
  task_id,
  action,
  occurred_at,
  occurred_date,
  user_id
FROM task_logs
WHERE task_id = '<completed_task_id>'
  AND action = 'complete'
ORDER BY occurred_at DESC
LIMIT 1;
-- occurred_date가 오늘 날짜여야 함 (DB 기본값 사용, 타임존 안전)

-- 3. 완료 로그가 정확히 1개인지 확인 (unique constraint로 중복 방지)
SELECT 
  task_id,
  COUNT(*) as log_count
FROM task_logs
WHERE task_id = '<completed_task_id>'
  AND action = 'complete'
  AND occurred_date = CURRENT_DATE;
-- 결과: 1이어야 함 (unique_task_log_per_day 제약조건으로 보장됨)
```

---

## 테스트 5: 프로젝트 삭제 CASCADE

### UI 단계

1. **테스트 데이터 준비 및 ID 캡처**
   - 프로젝트 생성: `Cascade Test Project`
   - **중요**: 프로젝트 ID 기록 (Supabase Table Editor에서 확인)
   - 작업 2개 생성: `Cascade Task 1`, `Cascade Task 2`
   - **중요**: 두 작업의 ID 기록 (task_id_1, task_id_2)
   - Weekly 탭에서 작업 1개를 주간 계획에 추가
   - Today 탭에서 해당 작업을 "Pick for Today"로 선택
   - Today 탭에서 작업 1개를 완료 처리

2. **프로젝트 삭제 전 데이터 확인 (선택사항)**
   - Supabase Table Editor에서 다음 쿼리 실행하여 삭제 전 상태 확인:
   ```sql
   -- 삭제 전 확인용 (선택사항)
   SELECT 
     (SELECT id FROM projects WHERE name = 'Cascade Test Project') as project_id,
     (SELECT id FROM tasks WHERE title = 'Cascade Task 1') as task_id_1,
     (SELECT id FROM tasks WHERE title = 'Cascade Task 2') as task_id_2;
   ```

3. **프로젝트 삭제**
   - 프로젝트 상세 페이지에서 "Delete Project" 클릭
   - 1단계: 경고 메시지 확인 후 "Continue" 클릭
   - 2단계: 프로젝트 이름 입력 (`Cascade Test Project`)
   - "Delete Project" 클릭
   - `/projects` 페이지로 리다이렉트되는지 확인

4. **CASCADE 삭제 확인**
   - 프로젝트가 목록에서 사라졌는지 확인
   - 관련 작업들이 모두 삭제되었는지 확인
   - 주간 계획 아이템이 삭제되었는지 확인
   - 작업 로그가 삭제되었는지 확인

### 검증 SQL

```sql
-- 방법 1: 프로젝트 이름으로 검증 (권장)
-- 프로젝트가 삭제되었으므로 관련 데이터도 모두 삭제되어야 함

-- 1. 프로젝트 삭제 확인
SELECT COUNT(*) as project_count
FROM projects
WHERE name = 'Cascade Test Project';
-- 결과: 0이어야 함

-- 2. 관련 작업 삭제 확인 (작업 이름으로)
SELECT COUNT(*) as task_count
FROM tasks
WHERE title IN ('Cascade Task 1', 'Cascade Task 2');
-- 결과: 0이어야 함

-- 3. 주간 계획 아이템 삭제 확인 (작업 이름으로)
SELECT COUNT(*) as item_count
FROM weekly_plan_items wpi
JOIN tasks t ON t.id = wpi.task_id
WHERE t.title IN ('Cascade Task 1', 'Cascade Task 2');
-- 결과: 0이어야 함

-- 4. 작업 로그 삭제 확인 (작업 이름으로)
SELECT COUNT(*) as log_count
FROM task_logs tl
JOIN tasks t ON t.id = tl.task_id
WHERE t.title IN ('Cascade Task 1', 'Cascade Task 2');
-- 결과: 0이어야 함

-- 방법 2: 캡처한 ID로 검증 (더 정확)
-- 삭제 전에 기록한 project_id, task_id_1, task_id_2 사용

-- 1. 프로젝트 삭제 확인
SELECT COUNT(*) as project_count
FROM projects
WHERE id = '<captured_project_id>';
-- 결과: 0이어야 함

-- 2. 관련 작업 삭제 확인
SELECT COUNT(*) as task_count
FROM tasks
WHERE id IN ('<captured_task_id_1>', '<captured_task_id_2>');
-- 결과: 0이어야 함

-- 3. 주간 계획 아이템 삭제 확인
SELECT COUNT(*) as item_count
FROM weekly_plan_items
WHERE task_id IN ('<captured_task_id_1>', '<captured_task_id_2>');
-- 결과: 0이어야 함

-- 4. 작업 로그 삭제 확인
SELECT COUNT(*) as log_count
FROM task_logs
WHERE task_id IN ('<captured_task_id_1>', '<captured_task_id_2>');
-- 결과: 0이어야 함

-- 5. 종합 확인 (모든 관련 데이터가 삭제되었는지)
SELECT 
  (SELECT COUNT(*) FROM projects WHERE name = 'Cascade Test Project') as projects,
  (SELECT COUNT(*) FROM tasks WHERE title LIKE 'Cascade Task%') as tasks,
  (SELECT COUNT(*) FROM weekly_plan_items wpi
   JOIN tasks t ON t.id = wpi.task_id
   WHERE t.title LIKE 'Cascade Task%') as plan_items,
  (SELECT COUNT(*) FROM task_logs tl
   JOIN tasks t ON t.id = tl.task_id
   WHERE t.title LIKE 'Cascade Task%') as logs;
-- 모든 값이 0이어야 함
```

---

## 테스트 6: Review 통계 계산

### UI 단계

1. **테스트 데이터 준비**
   - 프로젝트 2개 생성: `Review Project A`, `Review Project B`
   - 각 프로젝트에 작업 2개씩 생성 (총 4개)
   - Weekly 탭에서 모든 작업을 주간 계획에 추가
   - Today 탭에서 작업 2개를 완료 (Project A에서 1개, Project B에서 1개)

2. **Review 페이지 확인**
   - `/review` 접근
   - 완료율이 50% (2/4)로 표시되는지 확인
   - 총 작업 수: 4
   - 완료 작업 수: 2
   - Project A 완료 수: 1
   - Project B 완료 수: 1

3. **리뷰 저장**
   - "What Worked" 입력: `Test worked well`
   - "What Blocked" 입력: `No blockers`
   - "Next Week Focus" 입력: `Continue testing`
   - "Save Review" 클릭
   - 저장 성공 메시지 확인

### 검증 SQL

```sql
-- 1. 주간 통계 수동 계산
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
WHERE wpi.weekly_plan_id = (
  SELECT id FROM weekly_plans 
  WHERE user_id = '<your_user_id>' 
    AND week_key = '<current_week_key>' 
  LIMIT 1
);

-- 2. 프로젝트별 완료 수
SELECT 
  p.name as project_name,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE t.is_done = true) as completed_tasks
FROM weekly_plan_items wpi
JOIN tasks t ON t.id = wpi.task_id
JOIN projects p ON p.id = t.project_id
WHERE wpi.weekly_plan_id = (
  SELECT id FROM weekly_plans 
  WHERE user_id = '<your_user_id>' 
    AND week_key = '<current_week_key>' 
  LIMIT 1
)
GROUP BY p.id, p.name
ORDER BY p.name;

-- 3. 주간 리뷰 확인
SELECT 
  id,
  weekly_plan_id,
  what_worked,
  what_blocked,
  next_week_focus,
  created_at,
  updated_at
FROM weekly_reviews
WHERE weekly_plan_id = (
  SELECT id FROM weekly_plans 
  WHERE user_id = '<your_user_id>' 
    AND week_key = '<current_week_key>' 
  LIMIT 1
);
```

---

## 엣지 케이스 및 수정 사항

### 발견된 문제점

1. **WeeklyTab에서 중복 체크 누락**
   - **파일**: `app/components/WeeklyTab.tsx`
   - **문제**: `addToWeek` 함수에서 중복 체크를 하지 않음
   - **영향**: DB 제약조건으로 보호되지만, 사용자에게 에러 메시지가 표시되지 않음
   - **수정 필요**: ✅ (아래 수정 코드 참조)

2. **week_key 생성 로직 검증 필요**
   - **파일**: `lib/utils/week.ts`
   - **문제**: `getWeekKey` 함수가 ISO 주 번호를 사용하지 않을 수 있음
   - **영향**: 연도 경계에서 잘못된 week_key가 생성될 수 있음
   - **수정 필요**: ⚠️ (개선 권장)

3. **완료된 작업의 중복 로그 방지**
   - **파일**: `app/components/TodayTab.tsx`
   - **문제**: 이미 완료된 작업을 다시 체크하면 중복 로그가 생성될 수 있음
   - **영향**: 통계 계산에 오류 발생 가능
   - **수정 필요**: ✅ (아래 수정 코드 참조)

---

## 적용된 수정 사항

### 수정 1: week_key 형식 통일 ✅

**파일**: `lib/utils/week.ts`
- ISO 8601 주 번호를 사용하여 "YYYY-ww" 형식으로 통일
- 연도 경계 처리 개선

### 수정 2: task_logs unique constraint 추가 ✅

**마이그레이션**: `add_task_logs_unique_constraint`
- `(user_id, task_id, action, occurred_date)` unique constraint 추가
- 하루에 같은 작업의 같은 액션 로그가 1개만 생성되도록 보장

### 수정 3: TodayTab 타임존 안전성 개선 ✅

**파일**: `app/components/TodayTab.tsx`
- `occurred_at`과 `occurred_date`를 클라이언트에서 보내지 않음
- DB 기본값 사용으로 타임존 문제 해결
- unique constraint로 중복 방지

### 수정 4: WeeklyTab 중복 체크 ✅

**파일**: `app/components/WeeklyTab.tsx`
- 중복 체크 추가
- unique constraint violation 처리

---

## 테스트 체크리스트 요약

- [ ] 테스트 1: 프로젝트 및 작업 CRUD
- [ ] 테스트 2: 주간 계획 자동 생성
- [ ] 테스트 3: 주간 계획에 작업 추가 및 Today 선택
- [ ] 테스트 4: 작업 완료 및 로그 생성
- [ ] 테스트 5: 프로젝트 삭제 CASCADE
- [ ] 테스트 6: Review 통계 계산

각 테스트 후 해당 SQL 쿼리로 데이터를 검증하세요.
