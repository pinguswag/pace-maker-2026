# 커밋 메시지 가이드

## 수정 사항별 커밋 메시지

### 1. week_key 형식 통일

```bash
git add lib/utils/week.ts
git commit -m "refactor: Unify week_key format to YYYY-ww using ISO 8601

- Use ISO 8601 week numbering for consistent week_key
- Handle year boundaries correctly (Jan 4 rule)
- Format: YYYY-ww (e.g., 2026-03)
- Update all code and SQL docs to use consistent format"
```

### 2. task_logs unique constraint 추가

```bash
# 마이그레이션은 이미 적용됨
git commit -m "feat: Add unique constraint to task_logs

- Prevent duplicate logs per (user_id, task_id, action, occurred_date)
- Ensure one log entry per task per day
- Improve data integrity for statistics
- Migration: add_task_logs_unique_constraint"
```

### 3. TodayTab 타임존 안전성 개선

```bash
git add app/components/TodayTab.tsx
git commit -m "fix: Use DB defaults for task_logs timestamps

- Remove client-side date/time generation
- Rely on DB defaults for occurred_at and occurred_date
- Handle timezone issues by using server time
- Add unique constraint violation handling
- Prevent duplicate logs through database constraints"
```

### 4. SMOKE_TEST_GUIDE.md 업데이트

```bash
git add SMOKE_TEST_GUIDE.md
git commit -m "docs: Update smoke test guide with improved verification

- Clarify backlog visibility rules in Test 3
- Improve CASCADE delete verification SQL in Test 5
- Add task ID capture instructions before deletion
- Update log verification to reflect unique constraint
- Add timezone safety notes"
```

### 5. 엣지 케이스 문서 추가

```bash
git add EDGE_CASES_FIXES.md
git commit -m "docs: Add edge cases fixes documentation

- Document week_key format unification
- Document task_logs unique constraint
- Document timezone safety improvements
- Include verification SQL queries"
```

---

## 통합 커밋 (선택사항)

모든 수정 사항을 하나의 커밋으로 묶고 싶다면:

```bash
git add lib/utils/week.ts app/components/TodayTab.tsx SMOKE_TEST_GUIDE.md EDGE_CASES_FIXES.md
git commit -m "refactor: Unify edge cases and improve smoke test reliability

- Unify week_key format to YYYY-ww using ISO 8601
- Add unique constraint to task_logs (user_id, task_id, action, occurred_date)
- Use DB defaults for task_logs timestamps (timezone safe)
- Update smoke test guide with improved verification SQL
- Document all edge case fixes"
```

---

## 검증 커밋

수정 사항이 제대로 작동하는지 확인 후:

```bash
git add .
git commit -m "test: Verify edge case fixes

- Verify week_key format consistency
- Verify unique constraint prevents duplicate logs
- Verify timezone safety in task completion
- All smoke tests passing"
```
