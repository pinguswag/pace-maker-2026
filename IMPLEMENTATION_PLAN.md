# Pace Maker 2026 - 구현 계획 및 문서

## Phase 1: 데이터베이스 (완료 ✅)

### 마이그레이션
- `initial_schema` 마이그레이션이 Supabase에 적용되었습니다.
- 모든 테이블, 외래 키, 인덱스, RLS 정책이 생성되었습니다.

### 테이블 구조
1. **projects** - 프로젝트 관리
2. **tasks** - 작업 관리 (projects에 CASCADE DELETE)
3. **weekly_plans** - 주간 계획
4. **weekly_plan_items** - 주간 계획 아이템 (tasks, weekly_plans에 CASCADE DELETE)
5. **task_logs** - 작업 완료 로그 (tasks에 CASCADE DELETE)
6. **weekly_reviews** - 주간 리뷰 (weekly_plans에 CASCADE DELETE)

## Phase 2: Next.js 앱 (완료 ✅)

### 파일 구조

```
app/
├── layout.tsx                    # 루트 레이아웃
├── page.tsx                      # Home 페이지 (Weekly/Today 탭)
├── components/
│   ├── Navigation.tsx           # 네비게이션 바
│   ├── WeeklyTab.tsx             # Weekly 탭 컴포넌트
│   ├── TodayTab.tsx              # Today 탭 컴포넌트
│   └── DeleteProjectModal.tsx    # 2단계 삭제 확인 모달
├── projects/
│   ├── page.tsx                  # 프로젝트 목록
│   ├── new/
│   │   └── page.tsx              # 새 프로젝트 생성
│   └── [id]/
│       └── page.tsx              # 프로젝트 상세 (작업 CRUD)
└── review/
    └── page.tsx                  # 주간 리뷰

lib/
├── database.types.ts             # Supabase 타입 정의
├── supabase/
│   ├── client.ts                # 브라우저 클라이언트
│   ├── server.ts                # 서버 클라이언트
│   └── middleware.ts            # 미들웨어 클라이언트
├── utils/
│   ├── auth.ts                  # 인증 유틸리티
│   └── week.ts                  # 주간 계산 유틸리티
└── db/
    ├── projects.ts              # 프로젝트 DB 함수
    ├── tasks.ts                 # 작업 DB 함수
    ├── weekly-plans.ts          # 주간 계획 DB 함수
    └── weekly-reviews.ts        # 주간 리뷰 DB 함수
```

### 주요 기능

#### 1. Home - Weekly 탭
- 현재 주간 계획 자동 생성
- 백로그 작업을 주간 계획에 추가
- "Pick for Today" 기능
- 주간 계획에서 제거 기능

**Supabase 쿼리:**
- `weekly_plans` 테이블에서 현재 주의 계획 조회/생성
- `weekly_plan_items`와 `tasks`, `projects` 조인하여 목록 조회
- `tasks`에서 완료되지 않은 작업 조회 (백로그)

#### 2. Home - Today 탭
- `picked_for_today = true` AND `picked_date = today` 필터링
- 작업 완료 시:
  - `tasks.is_done = true`, `tasks.done_at = now()` 업데이트
  - `task_logs`에 완료 로그 삽입

**Supabase 쿼리:**
- `weekly_plan_items`에서 오늘 날짜로 필터링
- 작업 완료 시 트랜잭션처럼 두 작업 순차 실행

#### 3. Projects 화면
- 프로젝트 목록 조회
- 프로젝트 생성/수정/삭제
- 프로젝트 상세에서 작업 CRUD
- **2단계 삭제 확인 모달:**
  1. 첫 번째 단계: 경고 메시지 표시
  2. 두 번째 단계: 프로젝트 이름 입력 확인

**Supabase 쿼리:**
- `projects` CRUD 작업
- `tasks` CRUD 작업 (프로젝트별 필터링)
- 프로젝트 삭제 시 CASCADE DELETE로 관련 데이터 자동 삭제

#### 4. Review 화면
- 현재 주간 통계 계산:
  - 완료율 = 완료된 작업 / 전체 작업
  - 프로젝트별 완료 수
- 주간 리뷰 텍스트 저장/업데이트

**Supabase 쿼리:**
- `weekly_plan_items`와 `tasks`, `projects` 조인하여 통계 계산
- `weekly_reviews` UPSERT 작업

### Git 커밋 전략

각 기능별로 안전하게 커밋할 수 있는 단계:

1. **Phase 1 완료**
   ```
   git add .
   git commit -m "feat: Phase 1 - 데이터베이스 스키마 생성"
   ```

2. **Supabase 클라이언트 설정**
   ```
   git commit -m "feat: Supabase 클라이언트 및 타입 설정"
   ```

3. **Home - Weekly 탭**
   ```
   git commit -m "feat: Home - Weekly 탭 구현"
   ```

4. **Home - Today 탭**
   ```
   git commit -m "feat: Home - Today 탭 구현"
   ```

5. **Projects 화면**
   ```
   git commit -m "feat: Projects 화면 구현 (CRUD + 2단계 삭제 확인)"
   ```

6. **Review 화면**
   ```
   git commit -m "feat: Review 화면 구현"
   ```

### 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```
NEXT_PUBLIC_SUPABASE_URL=https://xnrvomjrppljjlhsidjt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhucnZvbWpycHBsampsaHNpZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxOTQ4MDYsImV4cCI6MjA4Mzc3MDgwNn0.LN2CI7QmtGkXMPrFx8MrvPQHt_0276cLTHu9A43rAfw
```

### 다음 단계 (선택사항)

1. **인증 시스템 추가**
   - Supabase Auth를 사용한 로그인/회원가입
   - 현재는 `auth.getUser()`로 사용자 확인만 수행

2. **드래그 앤 드롭**
   - Weekly 탭에서 `sort_order` 업데이트를 위한 드래그 앤 드롭 구현
   - `react-beautiful-dnd` 또는 `@dnd-kit/core` 사용 권장

3. **에러 처리 개선**
   - 전역 에러 바운더리
   - 사용자 친화적인 에러 메시지

4. **로딩 상태 개선**
   - 스켈레톤 UI
   - 낙관적 업데이트

5. **반응형 디자인**
   - 모바일 최적화
   - 태블릿 레이아웃
