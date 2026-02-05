import path from 'path'
import os from 'os'
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
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    })
    overlayWindow.setIgnoreMouseEvents(true)

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
      : path.join(__dirname, '../renderer/public/images/logo-icon.png')

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
      showSender()
    })

    // 자동 실행 기본 설정
    app.setLoginItemSettings({ openAtLogin: true })

  })()

function showSender() {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.center()
    mainWindow.focus()
  }
}

// 팡! 이벤트 수신 시 (IPC로 수신부에서 메인으로 알림)
ipcMain.on('trigger-pang', (event, data) => {
  if (isMuted) return // DND 모드면 아무것도 하지 않음

  // Phase 1: Tray Update
  if (tray) {
    const pangIcon = path.join(__dirname, '../renderer/public/images/logo-icon.png') // TODO: 🎉 이모지 아이콘으로 변경 로직
    // tray.setImage(...) 
  }

  // Phase 2: Show Overlay & Fireworks
  if (overlayWindow) {
    overlayWindow.show()
    overlayWindow.webContents.send('start-fireworks', data)
    setTimeout(() => {
      overlayWindow.hide()
    }, 4500) // 애니메이션 시간에 맞춰 조정
  }

  // Phase 3: Native Notification
  const title = data.isAnonymous
    ? '🧚 [쿠콘팡] 익명의 소식'
    : `📣 [쿠콘팡] ${data.sender}님의 소식!`

  const notification = new Notification({
    title,
    body: data.text,
    silent: false,
  })
  notification.show()

  // 5초 뒤 자동 닫기 요청
  setTimeout(() => {
    notification.close()
  }, 5000)
})

ipcMain.handle('get-username', () => {
  return os.userInfo().username || '동료님'
})

ipcMain.on('hide-sender', () => {
  if (mainWindow) mainWindow.hide()
})

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})
