# 드래그 앤 드롭 구현 가이드

## 구현 완료 사항

### 설치된 패키지
- `@dnd-kit/core` - 드래그 앤 드롭 핵심 기능
- `@dnd-kit/sortable` - 정렬 가능한 리스트 기능
- `@dnd-kit/utilities` - 유틸리티 함수

### 구현된 기능

1. **드래그 앤 드롭 정렬**
   - 주간 계획 아이템을 드래그하여 순서 변경
   - 드래그 중 로컬 상태 즉시 업데이트
   - 드래그 종료 시 변경된 항목만 DB 업데이트

2. **드래그 핸들**
   - 각 아이템 왼쪽에 드래그 핸들 아이콘 추가
   - `cursor-grab` / `cursor-grabbing` 스타일 적용

3. **시각적 피드백**
   - 드래그 중 아이템 투명도 변경 (opacity: 0.5)
   - 드래그 오버레이로 이동 중인 아이템 표시
   - 드래그 중 배경색 및 그림자 효과

4. **최적화**
   - 변경된 항목만 DB 업데이트 (배치 처리)
   - Promise.all을 사용한 병렬 업데이트
   - 에러 발생 시 원래 상태로 복구

## 파일 변경 사항

### 수정된 파일
- `app/components/WeeklyTab.tsx` - 드래그 앤 드롭 기능 추가

### 주요 변경 내용

1. **SortableItem 컴포넌트 추가**
   - `useSortable` 훅 사용
   - 드래그 핸들 UI 추가
   - 드래그 중 스타일 적용

2. **DragOverlayItem 컴포넌트 추가**
   - 드래그 중 표시되는 오버레이 아이템

3. **DndContext 통합**
   - `DndContext`, `SortableContext` 사용
   - `handleDragStart`, `handleDragEnd`, `handleDragCancel` 핸들러 추가

4. **최적화된 업데이트 로직**
   - 이동 범위 내의 항목만 확인
   - 실제로 변경된 항목만 DB 업데이트
   - Promise.all로 병렬 처리

## 사용 방법

1. 주간 계획 아이템 왼쪽의 드래그 핸들(6개 점 아이콘)을 클릭
2. 원하는 위치로 드래그
3. 놓으면 자동으로 순서가 저장됨

## 기술 세부사항

### 드래그 센서
- `PointerSensor`: 마우스/터치 이벤트
- `KeyboardSensor`: 키보드 접근성 (화살표 키)

### 충돌 감지
- `closestCenter`: 가장 가까운 중심점 기준

### 정렬 전략
- `verticalListSortingStrategy`: 수직 리스트 정렬

### 업데이트 최적화
- 이동 범위 내의 항목만 확인 (startIndex ~ endIndex)
- 이전 sort_order와 새 sort_order 비교
- 변경된 항목만 배열에 추가
- Promise.all로 병렬 업데이트

## 커밋 메시지

```bash
git add app/components/WeeklyTab.tsx package.json package-lock.json
git commit -m "feat: Add drag-and-drop ordering for weekly plan items

- Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Implement SortableItem component with drag handle
- Add visual feedback during drag (opacity, overlay)
- Optimize DB updates: only update changed items
- Use Promise.all for parallel batch updates
- Maintain stable ordering across reloads
- Add keyboard accessibility support"
```
