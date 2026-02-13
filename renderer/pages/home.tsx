import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { db } from '../lib/firebase'
import { ref, push, onChildAdded, serverTimestamp, query, orderByChild, startAt, endAt, get, limitToLast, update } from 'firebase/database'
import { getTodayRecommendation } from '../utils/dateHelper'

const COMMON_EMOJIS = [
  // 1. [표정 & 감정]
  '🤣', '🫠', '🤔', '🤨', '😏', '🤤', '🤮', '🤯', '🤠', '🤡',
  '🥳', '🥸', '😎', '🤩', '🥵', '🥶', '😱', '🤫', '🙃', '👻',
  '👽', '👾', '🤖', '💩', '😈', '👿', '👺', '👹', '🧐', '🥺',
  '🤭', '🥱', '😴', '😭', '😤', '😡', '🤬', '🙄', '🤪', '😵‍💫',

  // 2. [손동작 & 리액션]
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
  '👌', '🤌', '🤏', '✋', '🤚', '👋', '👏', '🙌', '👐', '🤲',
  '🙏', '🤝', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '👃',

  // 3. [파티 & 축하]
  '🎉', '🎊', '✨', '🎈', '🎆', '🎇', '🧨', '🎀', '🎁', '🎂',
  '🥂', '🍻', '🍷', '🍹', '🍾', '🏮', '🎐', '🧧', '🎠', '🎡',

  // 4. [동물 & 자연]
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋',
  '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎',
  '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳',

  // 5. [음식 & 음료]
  '🍔', '🍕', '🍗', '🌭', '🥗', '🍩', '🍰', '🧁', '🍦', '🍪',
  '☕', '🥤', '🍺', '🍻', '🍷', '🍹', '🍎', '🍓', '🍇', '🍉',
  '🥪', '🌮', '🍜', '🍣', '🍤', '🍱', '🥞', '🧇', '🧀', '🥨',
  '🥐', '🥯', '🥓', '🥩', '🍟', '🍙', '🥟', '🍢', '🍧', '🍨',

  // 6. [우주 & 날씨 & 사물]
  '☀️', '🌕', '🌠', '🛸', '🚀', '⚡', '🌈', '🔥', '💧', '🌊',
  '🪐', '🌌', '🌍', '☄️', '🌩️', '❄️', '🌪️', '🌋', '⛺', '💻',
  '✅', '🚨', '🕒', '📅', '📝', '📢', '🔔', '📌', '💎', '💰',
  '💸', '💣', '🔮', '🧿', '🧸', '🪀', '👑', '🏆', '🥇', '💢'
]

export default function HomePage() {
  const [text, setText] = useState('')
  const [nickname, setNickname] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [mountTime] = useState(Date.now())

  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // v1.0.7 추가 상태
  const [base64Image, setBase64Image] = useState<string | null>(null)
  const [photoCooldown, setPhotoCooldown] = useState(0)
  const [imageError, setImageError] = useState<string | null>(null)

  const recommendation = getTodayRecommendation()
  const pickerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
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

  // v1.0.7 쿨다운 타이머
  useEffect(() => {
    if (photoCooldown > 0) {
      const timer = setTimeout(() => setPhotoCooldown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [photoCooldown])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEmojiPicker) {
          setShowEmojiPicker(false)
        } else {
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

  // v1.0.7 지능형 50KB 압축 함수
  const compressTo50KB = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // 1단계 리사이징: 최대 600px (화질 확보 우선)
          const MAX_SIZE = 600
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          // 2단계: 품질을 낮춰가며 50KB(51200 Bytes) 맞추기
          let quality = 0.8
          let base64 = ''

          const attemptCompress = () => {
            base64 = canvas.toDataURL('image/jpeg', quality)
            const size = Math.round((base64.length * 3) / 4)

            if (size > 51200 && quality > 0.1) {
              quality -= 0.1
              attemptCompress()
            } else if (size > 51200) {
              // 최저 품질에서도 초과 시 해상도 축소
              if (width > 200) {
                width *= 0.8
                height *= 0.8
                canvas.width = width
                canvas.height = height
                ctx?.drawImage(img, 0, 0, width, height)
                quality = 0.6
                attemptCompress()
              } else {
                reject(new Error('이미지가 너무 큽니다. 50KB 한도 초과!'))
              }
            } else {
              resolve(base64)
            }
          }
          attemptCompress()
        }
        img.onerror = () => reject(new Error('이미지 로드 실패'))
      }
      reader.onerror = () => reject(new Error('파일 읽기 실패'))
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processImage(file)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile()
        if (blob) processImage(blob)
        break
      }
    }
  }

  const processImage = async (file: File | Blob) => {
    setImageError(null)
    if (photoCooldown > 0) {
      setImageError(`재장전 중에는 사진을 첨부할 수 없습니다. (${photoCooldown}초 남음)`)
      setTimeout(() => setImageError(null), 3000)
      return
    }
    try {
      const compressed = await compressTo50KB(file)
      setBase64Image(compressed)
    } catch (err: any) {
      setImageError(err.message)
      setTimeout(() => setImageError(null), 3000)
    }
  }

  const handleSend = async () => {
    if ((!text.trim() && !base64Image) || isSending || (photoCooldown > 0 && !!base64Image)) return
    setIsSending(true)

    // 콤보 판정
    let maxCombo = 0;
    if (selectedEmojis.length > 0) {
      let currentCombo = 1;
      for (let i = 1; i < selectedEmojis.length; i++) {
        if (selectedEmojis[i] === selectedEmojis[i - 1]) {
          currentCombo++;
        } else {
          maxCombo = Math.max(maxCombo, currentCombo);
          currentCombo = 1;
        }
      }
      maxCombo = Math.max(maxCombo, currentCombo);
    }

    try {
      const pangRef = ref(db, 'pang_events')

      const payload: any = {
        text: text.trim() || (base64Image ? '사진을 보냈습니다! 📸' : ''),
        sender: isAnonymous ? '익명의 요정' : (nickname || '익명'),
        isAnonymous,
        timestamp: serverTimestamp(),
        emojis: selectedEmojis.length > 0 ? selectedEmojis : null,
        comboCount: maxCombo,
        base64Image: base64Image
      }

      // UI 즉시 초기화
      setText('')
      setSelectedEmojis([])
      setHasAutoSelected(false)
      const sentImage = base64Image
      setBase64Image(null)

      // 사진 전송 시 10초 쿨다운
      if (sentImage) {
        setPhotoCooldown(10)
      }

      const newPostRef = await push(pangRef, payload)
      const postId = newPostRef.key

      if (!isAnonymous && nickname.trim()) {
        localStorage.setItem('coocon-pang-nickname', nickname)
      }

      // v1.0.7: 5초 후 발신자가 직접 데이터 삭제 (휘발성 보안)
      if (sentImage && postId) {
        setTimeout(async () => {
          try {
            const postRef = ref(db, `pang_events/${postId}`)
            await update(postRef, { base64Image: null })
            console.log(`[v1.0.7] ID ${postId} 사진 삭제 완료`)
          } catch (e) {
            console.error('이미지 자동 삭제 실패:', e)
          }
        }, 5000)
      }

      window.ipc.send('hide-sender', null)
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert('발송 중 오류가 발생했습니다.')
    } finally {
      setIsSending(false)
    }
  }

  const toggleEmoji = (emoji: string) => {
    setSelectedEmojis(prev => {
      // 광클 대응: 이전 상태를 기반으로 즉시 업데이트
      if (prev.length >= 20) return [...prev.slice(1), emoji]
      return [...prev, emoji]
    })
  }

  const clearEmojis = () => {
    setSelectedEmojis([])
    setHasAutoSelected(true)
  }

  const applyRecommendation = () => {
    if (recommendation) {
      setSelectedEmojis([...recommendation.emojis.slice(0, 5)])
      setHasAutoSelected(true)
    }
  }

  useEffect(() => {
    if (showEmojiPicker && !hasAutoSelected && selectedEmojis.length === 0 && recommendation) {
      setSelectedEmojis([...recommendation.emojis.slice(0, 5)])
      setHasAutoSelected(true)
    }
  }, [showEmojiPicker, recommendation, hasAutoSelected, selectedEmojis.length])

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
      <div className="flex flex-col h-screen bg-[#F7F9FC] border-2 border-[#00479B] p-4 rounded-lg overflow-hidden shadow-2xl relative font-sans" onPaste={handlePaste}>
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <img src="/images/logo-main.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-bold text-[#00479B] tracking-tight text-base">쿠콘팡! v1.0.7</span>
          </div>
          <button onClick={() => window.ipc.send('hide-sender', null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors">✕</button>
        </div>

        {/* Sender Info */}
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

        {/* Message Area */}
        <div className="relative mb-4 shrink-0 overflow-visible">
          <textarea
            autoFocus
            className={`h-24 w-full p-4 pr-12 pb-10 border rounded-xl focus:outline-none focus:ring-2 transition-all resize-none text-[13px] text-gray-900 bg-white shadow-inner ${isAnonymous ? 'border-purple-300 focus:ring-purple-400' : 'border-gray-200 focus:ring-[#36A3D1]'}`}
            placeholder={isAnonymous ? "익명의 소식을 전해보세요!" : "기쁜 소식을 적어주세요! (Ctrl+V로 사진 첨부)"}
            maxLength={50}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          {/* Image Preview & Errors */}
          {base64Image && (
            <div className="absolute top-2 right-12 w-16 h-16 border-4 border-[#36A3D1] rounded-xl shadow-2xl animate-fade-in-up z-40 bg-white">
              <img src={base64Image} className="w-full h-full object-cover rounded-md" alt="preview" />
              <button
                onClick={() => setBase64Image(null)}
                style={{ backgroundColor: '#222', color: '#FFF', opacity: 1, border: '2px solid #FFF' }}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 font-black z-50 text-base"
                title="사진 삭제"
              >✕</button>
            </div>
          )}

          {imageError && (
            <div
              style={{ backgroundColor: '#B91C1C', color: '#FFFFFF', zIndex: 9999 }}
              className="absolute top-4 left-4 right-4 mx-auto px-4 py-3 rounded-2xl border-4 border-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-bounce flex items-center justify-center gap-2 text-center text-[13px] font-black"
            >
              <span className="text-lg">⚠️</span> {imageError}
            </div>
          )}

          <div className="absolute left-3 right-12 bottom-2.5 flex items-center gap-2 z-20 overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar flex-1 whitespace-nowrap min-w-0 pr-1">
              {selectedEmojis.map((e, i) => (
                <span key={i} onClick={() => toggleEmoji(e)} className="w-7 h-7 shrink-0 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-lg text-sm shadow-sm hover:border-red-400 hover:bg-red-50 cursor-pointer transition-all active:scale-90 group relative">
                  {e}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-[7px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold">✕</div>
                </span>
              ))}
            </div>
            {selectedEmojis.length > 0 && (
              <div className="shrink-0 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-1 rounded-lg border border-gray-100 shadow-sm mr-1">
                <span className="text-[10px] font-bold text-[#00479B]">{selectedEmojis.length}개</span>
                <button onClick={(e) => { e.stopPropagation(); clearEmojis(); }} className="text-[10px] text-gray-400 hover:text-red-500 font-bold border-l border-gray-200 pl-1 transition-all active:scale-95">비우기</button>
              </div>
            )}
          </div>

          <div className="absolute right-3 bottom-3 flex flex-col gap-1 z-20">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photoCooldown > 0}
              className={`text-lg hover:scale-110 transition-transform p-1.5 rounded-full shadow-sm border border-gray-100 bg-white ${photoCooldown > 0 ? 'opacity-30' : 'opacity-100 hover:bg-blue-50'}`}
            >
              📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-lg hover:scale-110 transition-transform p-1.5 rounded-full hover:bg-gray-100 shadow-sm border border-gray-100 bg-white">
              {selectedEmojis.length > 0 ? selectedEmojis[0] : '😊'}
            </button>
          </div>

          {showEmojiPicker && (
            <div ref={pickerRef} className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-[#36A3D1] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 p-4 animate-fade-in-up flex flex-col overflow-hidden h-[260px]">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-50 shrink-0">
                <span className="text-xs font-black text-[#00479B] flex items-center gap-1.5 uppercase tracking-tighter cursor-default">🚀 발사 이모지 장착실</span>
                <div className="flex items-center gap-2">
                  <button onClick={clearEmojis} className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition-colors active:scale-95">전체 해제 🗑️</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all font-bold text-base">✕</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {recommendation && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50/50 to-white rounded-xl border border-blue-100 shadow-sm shrink-0">
                    <div className="flex items-center justify-between mb-2 px-0.5">
                      <span className="text-[10px] font-black text-[#00479B]">✨ {recommendation.dateLabel} 추천</span>
                      <button onClick={applyRecommendation} className="text-[8px] bg-[#00479B] text-white px-2 py-1 rounded hover:bg-blue-800 font-bold shadow-sm transition-all shadow-blue-900/20">세트 장착⚡</button>
                    </div>
                    <div className="flex gap-4 justify-center">
                      {recommendation.emojis.map(e => (
                        <button key={e} onClick={() => toggleEmoji(e)} className={`text-2xl hover:scale-125 transition-all outline-none ${selectedEmojis.includes(e) ? 'filter drop-shadow-md brightness-110 scale-110 ring-2 ring-blue-400 rounded-full' : 'grayscale-[0.5] opacity-20 hover:opacity-100'}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-8 gap-1.5 p-0.5 pb-4">
                  {COMMON_EMOJIS.map((e, idx) => (
                    <button
                      key={`${e}-${idx}`}
                      onClick={(evt) => {
                        evt.preventDefault();
                        toggleEmoji(e);
                      }}
                      className="text-[17px] hover:scale-125 transition-all text-center rounded-lg flex items-center justify-center aspect-square shadow-sm border-2 bg-white border-gray-100 hover:border-blue-200 active:bg-blue-50 active:scale-95"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 shrink-0 mb-4">
          <button
            onClick={handleSend}
            disabled={isSending || (!text.trim() && !base64Image) || (photoCooldown > 0 && !!base64Image)}
            style={{
              backgroundColor: isSending || (!text.trim() && !base64Image) || (photoCooldown > 0 && !!base64Image)
                ? '#E5E7EB'
                : (isAnonymous ? '#6D28D9' : '#00479B'),
              color: isSending || (!text.trim() && !base64Image) || (photoCooldown > 0 && !!base64Image)
                ? '#9CA3AF'
                : '#FFFFFF'
            }}
            className="flex-1 h-14 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-2 text-base shadow-xl border-2 border-white/20"
          >
            {isSending ? '발송 중...' : (photoCooldown > 0 && !!base64Image ? `📸 재장전 중... (${photoCooldown}s)` : '쿠콘팡! 쏘기 🚀')}
          </button>
        </div>

        {/* Footer Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-purple-500 w-4 h-4" />
            익명으로 쏘기
          </label>
        </div>

        {/* History List */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-gray-200 pt-3">
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {Object.keys(groupedHistory).length > 0 ? Object.keys(groupedHistory).map((dateKey) => (
              <div key={dateKey} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-[1px] flex-1 bg-gray-100"></div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">{formatDateLabel(groupedHistory[dateKey][0].timestamp)}</span>
                  <div className="h-[1px] flex-1 bg-gray-100"></div>
                </div>
                {groupedHistory[dateKey].map((item: any, idx: number) => (
                  <div key={idx} className="mb-2 p-2.5 bg-white rounded border border-gray-100 shadow-sm flex flex-col gap-1.5 hover:border-[#36A3D1]">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold ${item.isAnonymous ? 'text-purple-500' : 'text-[#00479B]'}`}>{item.sender}</span>
                      <span className="text-[9px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed break-words">{item.text}</p>
                  </div>
                ))}
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                <img src="/images/logo-main.png" className="w-8 h-8 mb-2 grayscale" alt="empty" />
                <span className="text-[11px] text-gray-500">아직 소식이 없어요. 첫 소식을 터뜨려보세요!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out forwards; }
      `}</style>
    </React.Fragment>
  )
}
