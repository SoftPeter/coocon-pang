import path from 'path'
import { app, ipcMain, Tray, Menu, nativeImage, globalShortcut, Notification, screen } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

let tray: Tray | null = null
let mainWindow: any = null
let overlayWindow: any = null
let isMuted = false
let overlayHideTimer: NodeJS.Timeout | null = null

  ; (async () => {
    await app.whenReady()

    // 1. 메인 윈도우 (메시지 발신용)
    mainWindow = createWindow('main', {
      width: 400,
      height: 560, // 이력 리스트 추가에 따라 높이 확장
      show: false,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    })

    // 2. 오버레이 윈도우 (폭죽 효과용)
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    overlayWindow = createWindow('overlay', {
      width,
      height,
      x: 0,
      y: 0,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      show: false,
      focusable: false,  // [최우선] 포커스 탈취 금지
      skipTaskbar: true, // 작업표시줄에 표시 안 함
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    })
    overlayWindow.setIgnoreMouseEvents(true, { forward: true })

    const port = process.argv[2]
    if (isProd) {
      await mainWindow.loadURL('app://./home')
      await overlayWindow.loadURL('app://./overlay')
    } else {
      await mainWindow.loadURL(`http://localhost:${port}/home`)
      await overlayWindow.loadURL(`http://localhost:${port}/overlay`)
      // mainWindow.webContents.openDevTools()
    }

    // 3. 시스템 트레이 초기화
    const iconPath = isProd
      ? path.join(process.resourcesPath, 'tray-icon.png')
      : path.join(__dirname, '../renderer/public/images/tray-icon.png')

    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)
    const contextMenu = Menu.buildFromTemplate([
      { label: '메시지 보내기 (Alt+S)', click: () => showSender() },
      {
        label: '알림 끄기 (DND)', type: 'checkbox', checked: isMuted, click: (item) => {
          isMuted = item.checked
        }
      },
      { type: 'separator' },
      {
        label: '자동 실행 설정', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin, click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked })
        }
      },
      { label: '종료', click: () => app.quit() }
    ])
    tray.setToolTip('쿠콘팡 (COOCON-PANG)')
    tray.setContextMenu(contextMenu)

    // 4. 글로벌 단축키 등록
    globalShortcut.register('Alt+S', () => {
      if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide()
      } else {
        showSender()
      }
    })

    // 5. 윈도우 파괴 시 참조 해제 로직 추가 (핫픽스)
    mainWindow.on('closed', () => { mainWindow = null })
    overlayWindow.on('closed', () => { overlayWindow = null })

    // 자동 실행 기본 설정
    app.setLoginItemSettings({ openAtLogin: true })

  })()

function showSender() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.center()
    mainWindow.focus()
  }
}

// 팡! 이벤트 수신 시 (IPC로 수신부에서 메인으로 알림)
ipcMain.on('trigger-pang', (event, data) => {
  if (isMuted) return // DND 모드면 아무것도 하지 않음
  if (!data) return // 방어적 코드

  // Phase 1: Tray Update (생략 가능하나 구조 유지)
  if (tray) {
    // tray 관련 로직
  }

  // Phase 2: Show Overlay & Fireworks - 핫픽스 적용 (안전한 접근)
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    try {
      console.log('[main] Sending trigger-pang to overlay:', data.comboCount)
      overlayWindow.showInactive()
      if (overlayWindow.webContents && !overlayWindow.webContents.isDestroyed()) {
        overlayWindow.webContents.send('trigger-pang', data)
      }

      // GOD 등급의 긴 연출(6초)을 고려하여 숨김 시간을 더 넉넉히 가져감 (7.5초)
      // 기존 타이머가 있다면 취소하여 메시지 누적 시 오버레이가 일찍 닫히는 현상 방지
      if (overlayHideTimer) {
        clearTimeout(overlayHideTimer)
      }

      // 연출 시간 단축(4s)에 맞춰 숨김 시간을 5초로 조정
      const hideDuration = 5000
      overlayHideTimer = setTimeout(() => {
        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.hide()
          overlayHideTimer = null
        }
      }, hideDuration)
    } catch (e) {
      console.error('Error in overlay animation:', e)
    }
  }

  // Phase 3: Native Notification - 핫픽스 적용 (객체 생명주기 관리)
  try {
    const title = data.isAnonymous
      ? '🧚 [쿠콘팡] 익명의 소식'
      : `📣 [쿠콘팡] ${data.sender || '익명'}님의 소식!`

    const notification = new Notification({
      title,
      body: data.text || '',
      silent: false,
    })

    notification.show()

    // 5초 뒤 자동 닫기 요청 (안전한 정리)
    const notificationTimer = setTimeout(() => {
      // Notification 객체는 close() 시 에러가 잘 안 나지만 방어적으로 처리
      try {
        notification.close()
      } catch (e) { }
    }, 5000)
  } catch (e) {
    console.error('Error showing notification:', e)
  }
})

// ipcMain.handle('get-username', () => { ... }) 삭제 완료 (v1.0.5)

ipcMain.on('hide-sender', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
