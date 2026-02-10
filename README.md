# 🚀 쿠콘팡 (COOCON-PANG) v1.0.6 (Pure Combo Edition)

> **"5개의 감옥에서 탈출, 이제 진정한 '무한 연타'의 시대가 열렸습니다!"**

쿠콘팡은 사내 동료의 기쁜 소식을 실시간으로 공유하고, 화려한 이모지 폭죽 효과를 통해 즐거움을 배가시키는 데스크톱 애플리케이션입니다.  
**v1.0.6**에서는 사진 기능을 과감히 제거하고, 오직 텍스트와 이모지 연타(Combo)의 타격감에 올인한 경량화 시스템으로 한 단계 진화했습니다.

### ⚠️ 빌드 시 'Symbolic Link' 관련 오류 해결법
Windows 환경에서 `npm run build` 시 "Cannot create symbolic link" 오류가 발생한다면 다음 두 가지 방법 중 하나를 시도하세요.
1. **관리자 권한으로 실행**: 터미널(PowerShell/CMD) 또는 VS Code를 **'관리자 권한으로 실행'**한 뒤 명령어를 입력하세요.
2. **개발자 모드 활성화**: 윈도우 설정에서 **'개발자 설정'**을 검색한 후 **'개발자 모드'**를 **켬(On)**으로 변경하세요. (가장 추천하는 방법)

---

## ✨ v1.0.6 핵심 기능: '순수 콤보 팡'

### 1. 무한 콤보 시스템 (Infinity Combo)
메시지 속 연속된 이모지 개수를 파악하여 4단계의 풍성한 오버레이 연출이 터집니다.
| 단계 | 조건 | 연출 효과 (Overlay) | 타격감 요소 |
| :--- | :--- | :--- | :--- |
| **Normal** | 1~2개 | 기존 랜덤 위치 폭죽 연출 | 기본 효과음 지원 |
| **Combo** | 3~4개 | 중앙 집중형 연출. 이모지 1.5배 확대 | 입체적 애니메이션 |
| **Mega** | 5~9개 | 이모지 2.5배 확대. **화이트 플래시** | 강력한 **화면 흔들림(Shake)** |
| **GOD** | 10개+ | 4배 거대 이모지 + **슬로우 모션** + **이모지 상승(Rise)** | 극대화된 진동 및 잔상 효과 |

### 2. 발신부 (Sender) UX 고도화
- **🔥 광클 최적화**: 이모지 선택 버튼 반응 속도를 한계치까지 높여 연타 시 끊김 없는 즉각성을 제공합니다.
- **� 선택 개수 표시**: 이모지를 몇 개 장착했는지 실시간으로 UI에 표시합니다.
- **� 가로 스크롤 목록**: 20개 이상의 많은 이모지를 선택해도 UI가 깨지지 않고 깔끔하게 관리됩니다.
- **익명 투척**: '익명의 요정' 모드를 통해 부끄러움 없이 소식을 전할 수 있습니다.

### 3. 상향식(Rise) 연출 및 다중 전송 지원
- 모든 이모지 폭탄이 하늘로 시원하게 솟구치는 방향으로 통합되었습니다.
- 여러 명(혹은 한 명의 연타)이 동시에 쏘더라도 연출이 겹치지 않고 조화롭게 분산되어 출력됩니다.

---

## 🛠 기술 스택
- **Framework**: [Nextron](https://github.com/saltyshippo/nextron) (Next.js 14 + Electron)
- **Realtime DB**: Firebase Realtime Database (Text-only)
- **Styling**: Tailwind CSS & Vanilla CSS Animation
- **Language**: TypeScript

---

## 🚀 시작하기

### 1. 사전 준비
- Node.js 설치 (v18 이상 권장)
- Firebase 프로젝트 생성 및 Realtime Database 활성화

### 2. 환경 설정 (`.env`)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 빌드 및 패키징 (dist 폴더에 생성)
npm run build
```

---

## 📜 버전 히스토리 (최근)

### v1.0.6 (2026-02-10) - Pure Combo Edition
- **[기획]** '순수 콤보 팡' 체계 도입: 5개 상한 완전 삭제 및 텍스트 기반 무제한 콤보 지원.
- **[연출]** 티어별(Normal~GOD) 연출 및 상향식(Rise) 분수 효과 적용.
- **[UX]** 광클 최적화, 선택 개수 표시, 가로 스크롤 이모지 목록 추가.
- **[안정화]** 화면 진동/플래시 카운팅 시스템 도입으로 다중 연출 안정성 확보.

### v1.0.5 (2026-02-09)
- **[보안]** PC 사용자 이름 수집 로직 전면 삭제 및 닉네임 필드 초기화로 익명성 강화.

---

**쿠콘팡 v1.0.6과 함께 더 즐겁고 역동적인 오피스 라이프를 만들어보세요! 🚀🔥**
