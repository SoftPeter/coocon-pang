# 🚀 쿠콘팡 (COOCON-PANG)

> **"우리 팀의 즐거운 경사, 실시간으로 함께 터뜨리세요!"**

쿠콘팡은 사내 동료의 기쁜 소식을 실시간으로 공유하고, 화려한 이모지 폭죽 효과를 통해 즐거움을 배가시키는 데스크톱 애플리케이션입니다.

### ⚠️ 빌드 시 'Symbolic Link' 관련 오류 해결법
Windows 환경에서 `npm run build` 시 "Cannot create symbolic link" 오류가 발생한다면 다음 두 가지 방법 중 하나를 시도하세요.
1. **관리자 권한으로 실행**: 터미널(PowerShell/CMD) 또는 VS Code를 **'관리자 권한으로 실행'**한 뒤 명령어를 입력하세요.
2. **개발자 모드 활성화**: 윈도우 설정에서 **'개발자 설정'**을 검색한 후 **'개발자 모드'**를 **켬(On)**으로 변경하세요. (가장 추천하는 방법)

---

## 📂 프로젝트 구조
- **리얼타임 인터랙션**: 웹 브라우저를 띄워놓지 않아도 트레이에 상주하며 언제든 소식을 전합니다.
- **시각적 즐거움**: 소식이 도착하는 순간, 화면 하단에서 터지는 화려한 이모지 폭죽 쇼를 감상하세요.
- **심플한 사용성**: 단축키 하나로 소식을 전하고, OS 기본 알림으로 내용을 확인합니다.

---

## 🛠 기술 스택
- **Framework**: [Nextron](https://github.com/saltyshippo/nextron) (Next.js 14 + Electron)
- **Realtime DB**: Firebase Realtime Database
- **Styling**: Tailwind CSS & Vanilla CSS Animation
- **Language**: TypeScript

---

## ✨ 주요 기능

### 1. 발신부 (Sender)
- **전용 단축키**: `Alt + S`를 눌러 어디서든 즉시 발송창을 호출합니다.
- **📍 오늘의 소식 이력**: 발송창 하단에서 오늘 하루 동안 터진 즐거운 소식들을 실시간으로 확인합니다.
- **익명 투척**: '익명의 요정' 모드를 켜서 수줍게 소식을 전할 수 있습니다.
- **간결한 입력**: 최대 50자의 텍스트로 핵심만 빠르게 전달합니다.

### 2. 수신부 (Receiver)
- **실시간 폭죽 쇼**: 화면 하단에서 🎉, 🎊, ✨, 🍕 등 다양한 이모지들이 3초간 팝콘처럼 튀어 오릅니다.
- **🔕 방해 금지 모드 (DND)**: 업무에 집중해야 할 땐 트레이 메뉴에서 알림과 폭죽을 잠시 끌 수 있습니다.
- **네이티브 알림**: 윈도우/macOS 시스템 알림을 통해 메시지 내용을 즉시 확인합니다.

### 3. 시스템 최적화
- **중복 알림 방지**: 앱을 새로 켤 때 과거의 메시지가 다시 알림으로 뜨지 않도록 스마트하게 필터링합니다.
- **투명 오버레이**: 폭죽이 터지는 동안에도 뒤쪽 화면 클릭 및 작업이 가능합니다.
- **자동 실행**: PC 부팅 시 자동으로 실행되어 중요한 소식을 놓치지 않게 도와줍니다.

---

## 🚀 시작하기

### 1. 사전 준비
- Node.js 설치 (v18 이상 권장)
- Firebase 프로젝트 생성 및 Realtime Database 활성화

### 2. 환경 설정 (`.env`)
프로젝트 루트 폴더 혹은 `renderer/.env` 파일에 다음과 같이 Firebase 설정 값을 입력해 주세요.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. 설치 및 실행 (개발용)
```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev
```

### 4. EXE 파일 배포 (윈도우 설치 파일 생성)
팀원들에게 배포할 설치 파일(`.exe`)을 만들려면 아래 명령어를 실행하세요.
```bash
# 빌드 및 패키징
npm run build
```
- 실행이 완료되면 프로젝트 루트의 **`dist`** 폴더 안에 설치 파일이 생성됩니다.
- 생성된 `.exe` 파일을 팀원들에게 공유하여 설치하면 됩니다.

---

## 🛠 프로젝트 구조 및 커스텀

### 📂 주요 경로
- `main/`: Electron 메인 프로세스 (트레이, 단축키, DND 상태 관리)
- `renderer/`: Next.js 기반 UI 프로세스 (발송창, 폭죽 오버레이)
- `renderer/lib/`: Firebase 연동 로직
- `resources/`: 앱 아이콘(`.ico`) 및 빌드 리소스

### 🎨 앱 아이콘 변경하기
1. `resources` 폴더 안에 있는 `icon.ico` 파일을 원하는 아이콘으로 교체하세요.
2. `renderer/public/images/logo-icon.png` 파일을 교체하면 앱 내부 로고도 변경됩니다.

### ⌨️ 단축키 변경
- `main/background.ts` 파일의 `globalShortcut.register('Alt+S', ...)` 부분의 `'Alt+S'`를 원하는 키 조합으로 수정하세요.

---

## 💾 원격 저장소 연결 (Git)
프로젝트를 GitHub에 올리려면 다음 명령어를 참고하세요.
```bash
git remote add origin https://github.com/사용자계정/coocon-pang.git
git push -u origin main
```

**쿠콘팡과 함께 더 즐거운 오피스 라이프를 만들어보세요! 🚀**
