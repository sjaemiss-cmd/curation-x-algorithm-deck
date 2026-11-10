# 트위터 2023 vs X 2026 — 동일 게시글 비교

https://sjaemiss-cmd.github.io/curation-x-algorithm-deck/experience/

동일한 실제 과거 원문 10,000개를 두 화면에 나란히 배치합니다. 왼쪽은 2023년 Twitter 규칙, 오른쪽은 2026년 X 규칙입니다. 원문과 공통 입력을 고정한 **공개 계산 규칙 실험**이며 실제 운영 모델의 성능 비교가 아닙니다.

## 사용

각 화면의 ‘가중치 조절’에서 슬라이더 또는 JSON 코드를 변경합니다. 설정은 서로 독립적입니다. ‘왜 이 순위일까?’를 선택하면 그 글이 양쪽에서 몇 위인지 상단에 나타납니다. 이용자·검색·팔로우 필터는 상단에서 양쪽에 동일하게 적용합니다. 모바일은 비교 영역을 좌우로 밀어 두 화면을 확인합니다.

로컬 실행: Node 22에서 `npm start`, http://127.0.0.1:8877 . 런타임 npm 의존성은 없습니다. `체험앱.html`은 서버 없이 실행 가능한 단일 HTML입니다. 재생성: `python scripts/build_standalone.py`. 검증: `npm test`.

## 2023년 근거

- 계산: twitter/the-algorithm `ef4c5eb`의 `WeightedScoresSumScorer.scala`, `DiversityScorer.scala`, `DiversityDiscountProvider.scala`.
- 가중치: twitter/the-algorithm-ml `b852108`의 `projects/home/recap/README.md`에 명시된 **2023-04-05 값**입니다. 초기 Scala의 임시 기본값 1.0을 운영 가중치로 사용하지 않습니다.
- 좋아요 0.5, 리트윗 1, 답글 13.5, 좋은 프로필 클릭 12, 영상 절반 시청 0.005, 작성자 반응 답글 75, 좋은 클릭 11, 2분 이상 체류 10, 부정적 피드백 -74, 신고 -369.
- 10개 가중 합산 → 음수 변환(0.001) → 작성자 그룹별 다양성 배율 → 재정렬.
- 원 코드·문서·라이선스: `evidence/twitter-2023/`. 이식 구현: `twitter-engine.mjs`.

## 2026년 근거

- xai-org/x-algorithm `b5089266c0fbad66f388051f8f89056e2a8f974d` (2026-11-04).
- 30개 항목 가중 합산, 조건부 곱·게이트, 맞팔 보정, 음수 변환, 작성자 다양성, 팔로우 밖 배율.
- 27개 초기값은 param.rs에서 추출했습니다. video_continuation/user_video_continuation/profile_visit_secs 3개는 실험값 0으로 시작합니다.
- 원 코드: `evidence/scoring.rs`, `weights.rs`, `inputs.rs`. 원 라이선스: `evidence/LICENSE-X`. 이식 구현: `engine.mjs`.

## 같은 것과 다른 것

양쪽 후보 ID·원문 10,000개, 작성자 그룹·팔로우, 이용자가 동일합니다. 좋아요·답글·재게시·신고의 **실험 확률**을 양쪽에 그대로 공유합니다. 이는 실제 두 모델이 같은 예측을 했다는 뜻이 아닙니다.

2023년 ‘대화를 열고 2분 이상 체류할 확률’과 2026년 ‘체류 시간’은 정의·단위가 달라 같은 입력으로 강제하지 않습니다. 서로 대응하지 않는 항목은 별도의 고정 실험값입니다. 부정적 피드백 통합 값은 개별 확률의 단순 합이 아닙니다. 점수 절댓값은 시대 간 품질 척도로 비교할 수 없습니다.

같은 작성자 그룹의 다양성 배율은 두 코드 모두 `(1-floor)*decay^k+floor` 형태입니다. 그룹은 실제 작성자가 아니라 실험용 묶음입니다. 동점은 ID 순으로 고정하며, 이 동점 규칙을 운영 규칙이라고 주장하지 않습니다.

## 데이터

Cardiff NLP [TweetEval](https://github.com/cardiffnlp/tweeteval) sentiment train, 커밋 `4fbd22cd78421f05b1ecdb4fc5725bc7a7bd8f66`. 완전히 같은 텍스트를 중복 제거하고 seed 411로 10,000개 선택. 원문·행 번호·SHA-256은 `data/posts.json`, `data/provenance.json`에 보관했습니다. Unicode 이스케이프는 화면에서만 문자로 표시합니다.

출처: [TweetEval 논문](https://aclanthology.org/2020.findings-emnlp.148/), [원 sentiment 과제](https://aclanthology.org/S17-2088/). 데이터는 원 과제·TweetEval·Twitter의 이용 조건에 따릅니다. 코드를 위한 AGPL 허가를 데이터에 적용한다는 뜻이 아닙니다.

원 작성자·날짜·반응 수·이미지·영상은 없습니다. 반응 예상값은 글 길이·일부 단어와 결정적 난수로 만든 실험 입력이며 학습 모델이 아닙니다. Heavy Ranker/Phoenix 추론, 후보 검색, 평판·인증 등 전체 보정, Thompson Sampling, 광고 혼합, 전체 운영 필터는 재현하지 않습니다. 읽음 제외는 단순 Set membership입니다.

## UI·REA·검증

REA 6.8.0으로 X 페이지를 관찰하려 했으나 HTTP 403으로 막혔습니다. 로컬 초기 앱의 DOM·접근성 관찰은 성공했습니다. UI는 Twitter/X 형태의 교육용 모형이며 당시 앱 또는 현재 앱의 픽셀 단위 동일성을 검증한 것은 아닙니다.

계산·무결성 테스트 **13개 통과**. 세 이용자 조건 전체에서 10,000개 원문·ID·관계와 공통 확률 네 항목의 동일성을 검사했습니다. 2023 손계산·2026 원 소스 손계산 예제, 독립 조절, 음수·0·조건부 항목·다양성·필터를 확인했습니다. Scala/Rust 바이너리를 직접 컴파일한 대조는 아닙니다.

브라우저에서 두 화면 후보 일치, 다른 순위, 독립 가중치, 동일 글 양쪽 순위, 10/30개 기여분, 동시 이용자·검색 변경, 전체 초기화, 모바일 가로 비교, 단일 HTML 실행을 확인했습니다.

## 소스와 라이선스

수정된 구현은 이 디렉터리에 공개합니다. 2023 Twitter AGPL-3.0 코드에서 이식한 `twitter-engine.mjs`와 이 비교 앱의 작성 코드는 AGPL-3.0 조건으로 제공하며 `COPYING`을 포함합니다. 변경 내용: Scala 계산식을 JavaScript로 이식, 실험 입력·비교 UI 추가 (2026-11-10). 원본 Twitter 저작권·라이선스는 유지합니다. X 원 코드의 Apache-2.0 고지는 `evidence/LICENSE-X`에 유지합니다. 제3자 데이터·상표에는 각 원 권리가 적용됩니다.

공개 주소의 HTML/CSS/JavaScript, 데이터 JSON, 재생성 스크립트, 테스트 파일이 대응 소스입니다. 강의자료·비공개 Class 저장소·사용자 브라우저 캡처는 공개하지 않습니다.
