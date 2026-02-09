import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { db } from '../lib/firebase'
import { ref, push, onChildAdded, serverTimestamp, query, orderByChild, startAt, endAt, get, limitToLast } from 'firebase/database'
import { getTodayRecommendation } from '../utils/dateHelper'

const COMMON_EMOJIS = [
  // 축하/파티/행사
  '🎉', '🎊', '✨', '🥳', '🎈', '🎆', '🎀', '🎁', '🎂', '🥂',
  '🎇', '💎', '🕯️', '🧿', '🏮', '🎐', '🧧', '🎠', '🎡', '🎢',
  // 감정/사랑/열정
  '😊', '😍', '🥰', '😂', '🔥', '👍', '❤️', '💯', '🙌', '🌟',
  '😎', '🤩', '😘', '🌈', '🍀', '🍬', '🍭', '💡', '🎵', '💪',
  '🦋', '🌸', '☀️', '🌕', '🌠', '🛸', '👻', '🧜‍♀️', '🦄', '🧚‍♀️',
  // 음식/카페/간식
  '🍔', '🍕', '🍗', '🌭', '🥗', '🍩', '🍰', '🧁', '🍦', '🍪',
  '☕', '🥤', '🍺', '🍻', '🍷', '🍹', '🍎', '🍓', '🍇', '🍉',
  '🥪', '🌮', '🍜', '🍣', '🍤', '🍱', '🥞', '🧇', '🧀', '🥨',
  // 업무/생산성/기기
  '💻', '✅', '🚨', '🕒', '📅', '📝', '📢', '🚀', '⚡', '🏹',
  '🟢', '🔵', '🟠', '👑', '🏆', '🥇', '🥈', '🥉', '🔔', '📌'
]

export default function HomePage() {
  const [text, setText] = useState('')
  const [nickname, setNickname] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [mountTime] = useState(Date.now())

  // Emoji States
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false) // 자동 장착 완료 여부
  const recommendation = getTodayRecommendation()
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 1. 초기 데이터 로드 (1회성)
    const init = async () => {
      try {
        const savedNickname = localStorage.getItem('coocon-pang-nickname')
        if (savedNickname) setNickname(savedNickname)

        const today = new Date()
        const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).getTime()
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime()

        const pangRef = ref(db, 'pang_events')
        const historyQuery = query(pangRef, orderByChild('timestamp'), startAt(sevenDaysAgo), endAt(endOfToday), limitToLast(100))
        const snapshot = await get(historyQuery)
        if (snapshot.exists()) {
          const data = snapshot.val()
          if (data) {
            const list = Object.values(data).sort((a: any, b: any) => b.timestamp - a.timestamp)
            setHistory(list)
          }
        }
      } catch (err) { console.error(err) }
    }
    init()

    // 2. 실시간 리스너 (1회성 등록)
    const pangRef = ref(db, 'pang_events')
    const unsubscribe = onChildAdded(pangRef, (snapshot) => {
      try {
        const data = snapshot.val()
        if (data && data.timestamp && data.timestamp > mountTime) {
          window.ipc.send('trigger-pang', data)
        }
        if (data && data.timestamp) {
          const today = new Date()
          const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6).getTime()
          if (data.timestamp >= sevenDaysAgo) {
            setHistory(prev => {
              if (prev.find(item => item.timestamp === data.timestamp)) return prev
              return [data, ...prev].sort((a: any, b: any) => b.timestamp - a.timestamp)
            })
          }
        }
      } catch (err) { console.error(err) }
    })

    return () => unsubscribe()
  }, [mountTime])

  useEffect(() => {
    // 3. 키보드 및 마우스 이벤트 (단계적 종료 로직)
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) {
          // 1단계: 픽커만 종료
          setShowEmojiPicker(false)
        } else {
          // 2단계: 전체 창 종료
          window.ipc.send('hide-sender', null)
        }
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleSend = async () => {
    if (!text.trim()) return

    if (!isAnonymous && nickname.trim()) {
      localStorage.setItem('coocon-pang-nickname', nickname)
    }

    try {
      const pangRef = ref(db, 'pang_events')
      await push(pangRef, {
        text,
        sender: isAnonymous ? '익명의 요정' : (nickname || '익명'),
        isAnonymous,
        timestamp: serverTimestamp(),
        emojis: selectedEmojis.length > 0 ? selectedEmojis : null // 선택 없으면 null (수신측에서 스마트 디폴트 처리)
      })
      setText('')
      setSelectedEmojis([]) // 발송 후 초기화
      setHasAutoSelected(false) // 다음 발송 시 다시 추천받을 수 있도록 리셋
      window.ipc.send('hide-sender', null)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const toggleEmoji = (emoji: string) => {
    setSelectedEmojis(prev => {
      // 1. 이미 있으면 제거 (0개까지 가능하도록 제약 없음)
      if (prev.includes(emoji)) return prev.filter(e => e !== emoji)

      // 2. 꽉 찬 상태(5개)에서 추가 시, 첫 번째(가장 오래된) 것 제거하고 뒤에 추가 (FIFO)
      if (prev.length >= 5) {
        return [...prev.slice(1), emoji]
      }

      // 3. 여유 있으면 추가
      return [...prev, emoji]
    })
  }

  const clearEmojis = () => {
    setSelectedEmojis([])
    setHasAutoSelected(true) // 사용자가 명시적으로 비웠으므로 더 이상 자동 개입 안함
  }

  const applyRecommendation = () => {
    if (recommendation) {
      setSelectedEmojis([...recommendation.emojis.slice(0, 5)])
      setHasAutoSelected(true)
    }
  }

  useEffect(() => {
    // 기념일 자동 선택: 픽커가 열릴 때만 최초 1회 자동 장착 (사용자가 명시적으로 수정한 적 없을 때)
    if (showEmojiPicker && !hasAutoSelected && selectedEmojis.length === 0 && recommendation) {
      setSelectedEmojis([...recommendation.emojis.slice(0, 5)])
      setHasAutoSelected(true)
    }
    // 픽커가 닫힐 때 초기화하지 않고, 발송 후에만 초기화하여 세션 유지
  }, [showEmojiPicker, recommendation, hasAutoSelected])

  const formatDateLabel = (ts: number) => {
    const date = new Date(ts)
    const today = new Date()
    return date.toDateString() === today.toDateString() ? '오늘' : `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  const groupedHistory = history.reduce((acc: any, item: any) => {
    const dateKey = new Date(item.timestamp).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(item)
    return acc
  }, {})

  return (
    <React.Fragment>
      <Head>
        <title>쿠콘팡 - 메시지 보내기</title>
      </Head>
      <div className="flex flex-col h-screen bg-[#F7F9FC] border-2 border-[#00479B] p-4 rounded-lg overflow-hidden shadow-2xl relative font-sans">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <img src="/images/logo-main.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-bold text-[#00479B] tracking-tight text-base">쿠콘팡! 소식 쏘기</span>
          </div>
          <button onClick={() => window.ipc.send('hide-sender', null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors">✕</button>
        </div>

        {/* Sender Info - 고정 위치 */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <span className="text-xs font-semibold text-gray-500 w-12 shrink-0">보내는 이</span>
          <input
            type="text"
            placeholder="이름 입력 (미입력 시 익명)"
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#36A3D1] text-gray-900 bg-white"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isAnonymous}
          />
        </div>

        {/* Message Area - 입력창 고정 및 내부 장착 UI */}
        <div className="relative mb-4 shrink-0 overflow-visible">
          <textarea
            autoFocus
            className={`h-24 w-full p-4 pr-12 pb-10 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none text-[13px] text-gray-900 bg-white shadow-inner ${isAnonymous ? 'border-purple-300 focus:ring-purple-400' : 'border-gray-200 focus:ring-[#36A3D1]'
              }`}
            placeholder={isAnonymous ? "익명의 요정이 되어 소식을 전해보세요!" : "나누고 싶은 기쁜 소식을 적어주세요! (최대 50자)"}
            maxLength={50}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          />

          {/* 선택된 이모지 장착 UI - 입력창 내부 하단 왼쪽 */}
          <div className="absolute left-3 bottom-3 flex items-center gap-1.5 z-20">
            {selectedEmojis.map((e, i) => (
              <span
                key={i}
                onClick={() => toggleEmoji(e)}
                className="w-7 h-7 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-lg text-sm shadow-sm hover:border-red-400 hover:bg-red-50 cursor-pointer transition-all active:scale-90 group relative"
                title="제거하려면 클릭"
              >
                {e}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[7px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold">✕</div>
              </span>
            ))}
            {selectedEmojis.length > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); clearEmojis(); }}
                className="text-[10px] text-gray-400 hover:text-red-500 font-bold ml-1 bg-white/50 px-1 rounded hover:bg-red-50 transition-all"
                title="모두 해제"
              >
                비우기
              </button>
            )}
            {selectedEmojis.length === 0 && (
              <span className="text-[10px] text-gray-300 italic self-center">이모지 미선택 시 랜덤 발송🎲</span>
            )}
          </div>

          {/* Emoji Trigger Button - 입력창 내부 하단 오른쪽 */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-3 bottom-3 text-lg hover:scale-110 transition-transform p-1.5 rounded-full hover:bg-gray-100 shadow-sm border border-gray-100 bg-white z-20"
            title="이모지 선택"
          >
            {selectedEmojis.length > 0 ? selectedEmojis[0] : '😊'}
          </button>

          {/* Emoji Picker Popover - 입력창 하단(아래)으로 고정 배치 */}
          {showEmojiPicker && (
            <div ref={pickerRef} className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-[#36A3D1] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 p-4 animate-fade-in-up flex flex-col overflow-hidden h-[300px]">
              {/* 상단: 타이틀 및 닫기/해제 버튼 */}
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50 shrink-0">
                <span className="text-xs font-black text-[#00479B] flex items-center gap-1.5 uppercase tracking-tighter cursor-default">🚀 발사 이모지 장착실</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearEmojis}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition-colors active:scale-95"
                    title="장착된 모든 이모지 해제"
                  >
                    전체 해제 🗑️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); }}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all font-bold text-base"
                    title="닫기 (Esc)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 중단: 탐색 영역 (메인 그리드 + 내부 스크롤) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {/* 스마트 추천 섹션 - 슬림형 */}
                {recommendation && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50/50 to-white rounded-xl border border-blue-100 shadow-sm shrink-0">
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <span className="text-[10px] font-black text-[#00479B]">✨ {recommendation.dateLabel} 추천</span>
                      <button
                        onClick={applyRecommendation}
                        className="text-[8px] bg-[#00479B] text-white px-2 py-1 rounded hover:bg-blue-800 font-bold shadow-sm transition-all shadow-blue-900/20"
                      >
                        세트 장착⚡
                      </button>
                    </div>
                    <div className="flex gap-4 justify-center">
                      {recommendation.emojis.map(e => (
                        <button
                          key={e}
                          onClick={() => toggleEmoji(e)}
                          className={`text-2xl hover:scale-125 transition-all outline-none ${selectedEmojis.includes(e) ? 'filter drop-shadow-md brightness-110 scale-110 ring-2 ring-blue-400 rounded-full' : 'grayscale-[0.5] opacity-20 hover:opacity-100'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 데이터 정제 완료된 풍성한 그리드 */}
                <div className="grid grid-cols-8 gap-1.5 p-0.5 pb-4">
                  {COMMON_EMOJIS.map((e, idx) => (
                    <button
                      key={`${e}-${idx}`}
                      onClick={() => toggleEmoji(e)}
                      className={`text-[17px] hover:scale-125 transition-all text-center rounded-lg flex items-center justify-center aspect-square shadow-sm border-2 ${selectedEmojis.includes(e) ? 'bg-blue-50 border-blue-500 shadow-md scale-105' : 'bg-white border-gray-50 hover:border-blue-200'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 text-[9px] text-gray-300 text-center font-bold tracking-tight">
                * 꽉 찬 상태에서 클릭 시 가장 오래된 이모지부터 교체됩니다.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-purple-500 w-4 h-4" />
            익명으로 쏘기
          </label>
          <button onClick={handleSend} style={{ backgroundColor: isAnonymous ? '#9333ea' : '#00479B', color: '#ffffff', minWidth: '120px' }} className="px-8 py-2 rounded-md font-bold text-sm transition-all shadow-md active:scale-95 text-white">
            {isAnonymous ? '비밀스럽게 팡! 🧚' : '팡! 발사 🚀'}
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-gray-200 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#00479B]">📍 최근 소식 이력 (7일)</span>
            <span className="text-[10px] text-gray-400">일자별 그룹화</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {Object.keys(groupedHistory).length > 0 ? (
              Object.keys(groupedHistory).map((dateKey) => (
                <div key={dateKey} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-[1px] flex-1 bg-gray-100"></div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{formatDateLabel(groupedHistory[dateKey][0].timestamp)}</span>
                    <div className="h-[1px] flex-1 bg-gray-100"></div>
                  </div>
                  {groupedHistory[dateKey].map((item: any, idx: number) => (
                    <div key={idx} className="mb-2 p-2.5 bg-white rounded border border-gray-100 shadow-sm flex flex-col gap-1.5 transition-all hover:border-[#36A3D1]">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold ${item.isAnonymous ? 'text-purple-500' : 'text-[#00479B]'}`}>{item.sender || (item.isAnonymous ? '익명' : '알 수 없음')}</span>
                        <span className="text-[9px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed break-words">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                <img src="/images/logo-icon.png" className="w-8 h-8 mb-2 grayscale" alt="empty" />
                <span className="text-[11px] text-gray-500">아직 소식이 없어요. 첫 소식을 터뜨려보세요!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar-slim::-webkit-scrollbar { height: 3px; }
        .custom-scrollbar-slim::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-slim::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
      `}</style>
    </React.Fragment>
  )
}
