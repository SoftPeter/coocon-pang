import React, { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { getTodayRecommendation } from '../utils/dateHelper'

const DEFAULT_EMOJIS = ['🎉', '🎊', '✨', '🍕', '🍩', '🎈', '🔥', '🥳']

interface FireworkItem {
  id: number
  emoji: string
  left: string
  bottom: string
  delay: number
  scale: number
  isCenter: boolean
  batchId: number
}

export default function OverlayPage() {
  const [items, setItems] = useState<FireworkItem[]>([])
  const [grade, setGrade] = useState<'Normal' | 'Combo' | 'Mega' | 'GOD'>('Normal')
  const [activeFlashes, setActiveFlashes] = useState(0)
  const [activeShakes, setActiveShakes] = useState(0)

  // v1.0.7 추가 상태
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const [photoVisible, setPhotoVisible] = useState(false)
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const unsubscribe = window.ipc.on('trigger-pang', (data: any) => {
      triggerComboPang(data)
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  const triggerComboPang = (data: any) => {
    console.log('[overlay] Received data:', data)
    const combo = data?.comboCount || 0
    let currentGrade: 'Normal' | 'Combo' | 'Mega' | 'GOD' = 'Normal'

    if (combo >= 10) currentGrade = 'GOD'
    else if (combo >= 5) currentGrade = 'Mega'
    else if (combo >= 3) currentGrade = 'Combo'
    else currentGrade = 'Normal'

    console.log('[overlay] Grade Determined:', currentGrade, 'Combo:', combo)
    setGrade(currentGrade)

    let activeEmojis: string[] = data?.emojis && data.emojis.length > 0 ? data.emojis : null
    if (!activeEmojis) {
      const rec = getTodayRecommendation()
      activeEmojis = rec ? rec.emojis : DEFAULT_EMOJIS
    }

    const newItems: FireworkItem[] = []
    let count = 40
    let baseScale = 1

    if (currentGrade === 'Combo') {
      count = 60
      baseScale = 1.5
    } else if (currentGrade === 'Mega') {
      count = 100
      baseScale = 2.5
    } else if (currentGrade === 'GOD') {
      count = 200
      baseScale = 4
    }

    // Mega/GOD 등급 시 화면 진동 및 플래시 (카운팅 방식)
    if (currentGrade === 'Mega' || currentGrade === 'GOD') {
      setActiveFlashes(prev => prev + 1)
      setActiveShakes(prev => prev + 1)
      setTimeout(() => {
        setActiveFlashes(prev => Math.max(0, prev - 1))
        setActiveShakes(prev => Math.max(0, prev - 1))
      }, 2000)
    }

    const isCenterGrade = currentGrade !== 'Normal'
    const batchId = Date.now() + Math.random() // 소수점 추가로 완벽한 고유 ID 보장

    // 중앙 집중형일 때 기준점 자체를 랜덤화 (30% ~ 70% 사이)
    const baseCenterLeft = isCenterGrade ? (30 + Math.random() * 40) : 50
    const baseCenterBottom = isCenterGrade ? (30 + Math.random() * 40) : 50

    for (let i = 0; i < count; i++) {
      const isCenter = isCenterGrade
      // 개별 이모지 지터(Jitter): 중앙에서 솟구칠 때도 살짝씩 흩어지게
      const centerJitterX = isCenter ? (Math.random() - 0.5) * 15 : 0
      const centerJitterY = isCenter ? (Math.random() - 0.5) * 15 : 0

      newItems.push({
        id: batchId + i,
        emoji: activeEmojis[Math.floor(Math.random() * activeEmojis.length)],
        left: isCenter ? `calc(${baseCenterLeft}% + ${centerJitterX}%)` : `${Math.random() * 90 + 5}%`,
        bottom: isCenter ? `calc(${baseCenterBottom}% + ${centerJitterY}%)` : '0px',
        delay: currentGrade === 'GOD' ? Math.random() * 3 : Math.random() * 1.5,
        scale: baseScale * (0.8 + Math.random() * 0.4),
        isCenter,
        batchId
      })
    }

    setItems(prev => [...prev, ...newItems])

    // v1.0.7 사진 처리 로직
    if (data?.base64Image) {
      console.log('[v1.0.7] Photo received. Starting 7s cleanup timer.')

      // 단일 점유: 기존 타이머 및 사진 초기화
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current)

      setActivePhoto(data.base64Image)
      setPhotoVisible(true)

      // 7초 후 강제 수거 (메모리 최적화)
      photoTimerRef.current = setTimeout(() => {
        setPhotoVisible(false)
        setTimeout(() => {
          setActivePhoto(null) // Base64 데이터 메모리 해제
          console.log('[v1.0.7] Photo resources cleared from memory.')
        }, 500) // 페이드 아웃 시간 확보
      }, 7000)
    }

    // 각 연출 배치는 5초 후 자기 자신만 삭제
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.batchId !== batchId))
    }, 5000)
  }

  return (
    <React.Fragment>
      <Head>
        <title>쿠콘팡 - 오버레이 (Pure Combo)</title>
      </Head>
      <div className={`relative w-screen h-screen overflow-hidden transparent pointer-events-none ${activeShakes > 0 ? 'animate-shake' : ''}`}>
        {/* White Flash Effect (가시성 조절: 0.5 opacity) */}
        <div className={`absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none ${activeFlashes > 0 ? 'opacity-50' : 'opacity-0'}`} />

        {items.map((item) => (
          <div
            key={item.id}
            className={`absolute flex items-center justify-center ${grade === 'GOD' ? 'animate-slow-popcorn' : 'animate-popcorn'}`}
            style={{
              left: item.left,
              bottom: item.bottom,
              animationDelay: `${item.delay}s`,
              fontSize: `${20 * item.scale}px`,
              '--tx': `${(Math.random() - 0.5) * (item.isCenter ? 1200 : 300)}px`,
              '--ty': `${-(Math.random() * 700 + (item.isCenter ? 100 : 400))}px`,
              '--tr': `${(Math.random() - 0.5) * 1080}deg`,
              zIndex: Math.floor(item.scale * 10)
            } as any}
          >
            {item.emoji}
          </div>
        ))}

        {/* Full screen Emoji Rise (상향식 분수) for GOD grade */}
        {grade === 'GOD' && items.slice(0, 60).map((item, idx) => (
          <div
            key={`rise-${idx}`}
            className="absolute bottom-[-50px] animate-rise text-4xl"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 1.5 + 2}s`
            }}
          >
            {item.emoji}
          </div>
        ))}

        {/* v1.0.7 필살기: 사진 팡 레이어 (GPU 가속) */}
        {activePhoto && (
          <div
            className={`absolute inset-0 flex items-center justify-center z-[999] transition-all duration-500 ease-out will-change-[transform,opacity] ${photoVisible ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-12'}`}
            style={{ pointerEvents: 'none' }}
          >
            <div className="relative group">
              {/* 후광 효과 */}
              <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 animate-pulse rounded-full" />

              <img
                src={activePhoto}
                className="max-w-[80vw] max-h-[70vh] rounded-3xl border-8 border-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] object-contain transform translate3d(0,0,0)"
                alt="pang-photo"
                style={{ backfaceVisibility: 'hidden' }}
              />

              {/* 리본 장식 */}
              <div className="absolute -top-6 -left-6 text-5xl transform -rotate-12 animate-bounce">🎁</div>
              <div className="absolute -bottom-6 -right-6 text-5xl transform rotate-12 animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        body {
          background: transparent !important;
          margin: 0;
          overflow: hidden;
        }
        @keyframes popcorn {
          0% {
            transform: translate(0, 50px) scale(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            opacity: 1;
            transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(1.2);
          }
          100% {
            transform: translate(calc(var(--tx) * 1.2), calc(var(--ty) + 200px)) rotate(calc(var(--tr) * 1.5)) scale(0);
            opacity: 0;
          }
        }
        @keyframes slow-popcorn {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
            filter: blur(5px);
          }
          10% {
            opacity: 1;
            filter: blur(0px);
          }
          80% {
            opacity: 1;
            transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(1.5);
            filter: drop-shadow(0 0 20px goldenrod);
          }
          100% {
            transform: translate(calc(var(--tx) * 1.1), calc(var(--ty) + 100px)) scale(0);
            opacity: 0;
          }
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-10px, -10px); }
          20%, 40%, 60%, 80% { transform: translate(10px, 10px); }
        }
        @keyframes rise {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-110vh); opacity: 0; }
        }
        .animate-popcorn {
          animation: popcorn 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .animate-slow-popcorn {
          animation: slow-popcorn 4s cubic-bezier(0.1, 0.5, 0.2, 1) forwards;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
        .animate-rise {
          animation: rise linear forwards;
        }
      `}} />
    </React.Fragment>
  )
}
