import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { db } from '../lib/firebase'
import { ref, push, onChildAdded, serverTimestamp, query, orderByChild, startAt, endAt, get, limitToLast } from 'firebase/database'

export default function HomePage() {
  const [text, setText] = useState('')
  const [nickname, setNickname] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [userName, setUserName] = useState('동료님')
  const [history, setHistory] = useState<any[]>([])
  const [mountTime] = useState(Date.now()) // 앱 실행 시점 기록

  useEffect(() => {
    // 1. 로컬 스토리지 데이터 복구
    try {
      const savedNickname = localStorage.getItem('coocon-pang-nickname')
      if (savedNickname) setNickname(savedNickname)
    } catch (e) { console.error(e) }

    // 2. 시스템 사용자명 가져오기
    const fetchUser = async () => {
      try {
        const name = await window.ipc.invoke('get-username')
        if (name) setUserName(name)
      } catch (err) {
        console.error('Failed to get username', err)
      }
    }
    fetchUser()

    // 3. 오늘의 이력 데이터 로드
    const loadHistory = async () => {
      try {
        const today = new Date()
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime()

        const pangRef = ref(db, 'pang_events')
        // 인덱싱 문제 방지를 위해 기본적으로는 전체를 가져온 후 클라이언트 필터링 병행
        const todayQuery = query(
          pangRef,
          orderByChild('timestamp'),
          startAt(startOfDay),
          endAt(endOfDay),
          limitToLast(50) // 최근 50개만
        )

        const snapshot = await get(todayQuery)
        if (snapshot.exists()) {
          const data = snapshot.val()
          if (data) {
            const list = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp)
            setHistory(list)
          }
        }
      } catch (err) {
        console.error('History load error:', err)
        // 에러 발생 시 화이트 스크린 방지를 위해 빈 리스트 유지
      }
    }
    loadHistory()

    // 4. 실시간 리스너
    const pangRef = ref(db, 'pang_events')
    const unsubscribe = onChildAdded(pangRef, (snapshot) => {
      try {
        const data = snapshot.val()
        if (data) {
          // 알림 트리거: 앱 실행 시점(mountTime) 이후에 생성된 새로운 데이터만 알림
          // Firebase의 serverTimestamp와 로컬 mountTime(Date.now()) 비교
          // 약간의 오차를 감안하여 1초 정도의 여유를 줄 수도 있으나 우선 정밀비교
          if (data.timestamp && data.timestamp > mountTime) {
            window.ipc.send('trigger-pang', data)
          }

          // 이력 업데이트 (오늘의 데이터인 경우 리스트에 추가)
          const today = new Date()
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
          if (data.timestamp >= startOfDay) {
            setHistory(prev => {
              if (prev.find(item => item.timestamp === data.timestamp)) return prev
              return [data, ...prev].sort((a: any, b: any) => b.timestamp - a.timestamp)
            })
          }
        }
      } catch (err) { console.error(err) }
    })

    return () => unsubscribe()
  }, [])

  const handleSend = async () => {
    if (!text.trim()) return

    if (!isAnonymous && nickname.trim()) {
      localStorage.setItem('coocon-pang-nickname', nickname)
    }

    try {
      const pangRef = ref(db, 'pang_events')
      await push(pangRef, {
        text,
        sender: isAnonymous ? '익명의 요정' : `${nickname || '익명'}(${userName})`,
        isAnonymous,
        timestamp: serverTimestamp(),
      })
      setText('')
      window.ipc.send('hide-sender', null)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      window.ipc.send('hide-sender', null)
    }
  }

  const formatTime = (ts: number | any) => {
    if (!ts) return ''
    const date = new Date(ts)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <React.Fragment>
      <Head>
        <title>쿠콘팡 - 메시지 보내기</title>
      </Head>
      <div className="flex flex-col h-screen bg-[#F7F9FC] border-2 border-[#00479B] p-4 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <img src="/images/logo-icon.png" alt="Logo" className="w-6 h-6" />
            <span className="font-bold text-[#00479B]">쿠콘팡! 소식 쏘기</span>
          </div>
          <button
            onClick={() => window.ipc.send('hide-sender', null)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
            title="창 닫기 (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">보내는 이</span>
          <input
            type="text"
            placeholder="이름 입력 (예: 홍길동)"
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#36A3D1] text-gray-900 bg-white"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isAnonymous}
          />
          <span className="text-[10px] text-gray-400 shrink-0">({userName})</span>
        </div>

        <textarea
          autoFocus
          className={`h-28 w-full p-3 border rounded-md focus:outline-none focus:ring-2 transition-all resize-none text-sm text-gray-900 bg-white shadow-inner ${isAnonymous ? 'border-purple-300 focus:ring-purple-400' : 'border-gray-200 focus:ring-[#36A3D1]'
            }`}
          placeholder={isAnonymous ? "익명의 요정이 되어 소식을 전해보세요!" : "나누고 싶은 기쁜 소식을 적어주세요! (최대 50자)"}
          maxLength={50}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="flex justify-between items-center mt-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-purple-500 w-4 h-4"
            />
            익명으로 쏘기
          </label>
          <button
            onClick={handleSend}
            style={{
              backgroundColor: isAnonymous ? '#9333ea' : '#00479B',
              color: '#ffffff',
              display: 'inline-block',
              width: 'auto',
              minWidth: '120px'
            }}
            className="px-8 py-2 rounded-md font-bold text-sm transition-all shadow-md active:scale-95 text-white"
          >
            {isAnonymous ? '비밀스럽게 팡! 🧚' : '팡! 발사 🚀'}
          </button>
        </div>

        {/* 오늘의 이력 리스트 */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#00479B]">📍 오늘의 소식 이력</span>
            <span className="text-[10px] text-gray-400">당일 소식만 표시</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {history.length > 0 ? (
              history.map((item, idx) => (
                <div key={idx} className="mb-2 p-2.5 bg-white rounded border border-gray-100 shadow-sm flex flex-col gap-1.5 transition-all hover:border-[#36A3D1]">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold ${item.isAnonymous ? 'text-purple-500' : 'text-[#00479B]'}`}>
                      {item.sender}
                    </span>
                    <span className="text-[9px] text-gray-400">{formatTime(item.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed break-words">{item.text}</p>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                <img src="/images/logo-icon.png" className="w-8 h-8 mb-2 grayscale" alt="empty" />
                <span className="text-[11px] text-gray-500">오늘의 첫 소식을 기다리고 있어요!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .shrink-0 { flex-shrink: 0; }
      `}</style>
    </React.Fragment>
  )
}
