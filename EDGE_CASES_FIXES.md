# 엣지 케이스 통일 및 수정 사항

## 적용된 수정 사항

### 1. week_key 형식 통일 ✅

**파일**: `lib/utils/week.ts`

**변경 내용**:
- ISO 8601 주 번호를 사용하여 "YYYY-ww" 형식으로 통일
- 연도 경계 처리 개선 (1월 4일 기준)

**이전**: 월별 주 계산 (부정확)
**이후**: ISO 8601 주 번호 (정확)

**커밋 메시지**:
```
refactor: Unify week_key format to YYYY-ww using ISO 8601

- Use ISO 8601 week numbering for consistent week_key
- Handle year boundaries correctly (Jan 4 rule)
- Format: YYYY-ww (e.g., 2026-03)
```

---

### 2. task_logs unique constraint 추가 ✅

**마이그레이션**: `add_task_logs_unique_constraint`

**변경 내용**:
- `(user_id, task_id, action, occurred_date)` unique constraint 추가
- 하루에 같은 작업의 같은 액션 로그가 1개만 생성되도록 보장

**SQL**:
```sql
ALTER TABLE task_logs
ADD CONSTRAINT unique_task_log_per_day 
UNIQUE (user_id, task_id, action, occurred_date);
```

**커밋 메시지**:
```
feat: Add unique constraint to task_logs

- Prevent duplicate logs per (user_id, task_id, action, occurred_date)
- Ensure one log entry per task per day
- Improve data integrity for statistics
```

---

### 3. TodayTab 타임존 안전성 개선 ✅

**파일**: `app/components/TodayTab.tsx`

**변경 내용**:
- `occurred_at`과 `occurred_date`를 클라이언트에서 보내지 않음
- DB 기본값 사용으로 타임존 문제 해결
- unique constraint violation 처리 추가

**이전**:
```typescript
const now = new Date().toISOString()
const today = now.split('T')[0]
await supabase.from('task_logs').insert({
  user_id: user.id,
  task_id: taskId,
  action: 'complete',
  occurred_at: now,
  occurred_date: today,
})
```

**이후**:
```typescript
await supabase.from('task_logs').insert({
  user_id: user.id,
  task_id: taskId,
  action: 'complete',
  // occurred_at과 occurred_date는 DB 기본값 사용
})
```

**커밋 메시지**:
```
fix: Use DB defaults for task_logs timestamps

- Remove client-side date/time generation
- Rely on DB defaults for occurred_at and occurred_date
- Handle timezone issues by using server time
- Add unique constraint violation handling
```

---

### 4. SMOKE_TEST_GUIDE.md 업데이트 ✅

**변경 내용**:
1. **Test 3**: 백로그 가시성 규칙 명확화
   - 백로그는 "주간 계획에 없는 완료되지 않은 작업"만 표시
   - "이동" 대신 "제거" 표현 사용

2. **Test 5**: CASCADE 삭제 검증 SQL 개선
   - 삭제 전 task_ids 캡처 방법 추가
   - 프로젝트 이름/작업 이름으로 검증하는 방법 추가
   - 더 정확한 검증을 위한 두 가지 방법 제시

3. **Test 4**: 로그 검증 SQL 업데이트
   - unique constraint 설명 추가
   - DB 기본값 사용 설명 추가

**커밋 메시지**:
```
docs: Update smoke test guide with improved verification

- Clarify backlog visibility rules in Test 3
- Improve CASCADE delete verification SQL in Test 5
- Add task ID capture instructions
- Update log verification to reflect unique constraint
```

---

## 파일 변경 요약

### 수정된 파일
1. `lib/utils/week.ts` - week_key 형식 통일
2. `app/components/TodayTab.tsx` - 타임존 안전성 개선
3. `SMOKE_TEST_GUIDE.md` - 테스트 가이드 업데이트

### 새로 생성된 마이그레이션
1. `add_task_logs_unique_constraint` - unique constraint 추가

---

## 검증 방법

### week_key 형식 확인
```sql
-- 현재 주의 week_key 확인
SELECT 
  id,
  week_key,
  week_start_date
FROM weekly_plans
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 1;
-- week_key 형식: YYYY-ww (예: 2026-03)
```

### unique constraint 확인
```sql
-- unique constraint 확인
SELECT
    constraint_name,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'task_logs'
    AND constraint_type = 'UNIQUE'
    AND constraint_name = 'unique_task_log_per_day';
```

### 중복 로그 방지 테스트
```sql
-- 같은 작업을 같은 날 두 번 완료 시도 시도
-- 두 번째 시도는 unique constraint로 실패해야 함
INSERT INTO task_logs (user_id, task_id, action)
VALUES ('<user_id>', '<task_id>', 'complete');
-- 첫 번째: 성공
-- 두 번째: 에러 (unique constraint violation)
```

---

## 모든 수정 사항 적용 완료 ✅

- [x] week_key 형식 통일 (YYYY-ww)
- [x] task_logs unique constraint 추가
- [x] TodayTab 타임존 안전성 개선
- [x] SMOKE_TEST_GUIDE.md 업데이트
