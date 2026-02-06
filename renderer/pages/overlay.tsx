import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { getTodayRecommendation } from '../utils/dateHelper'

const DEFAULT_EMOJIS = ['🎉', '🎊', '✨', '🍕', '🍩', '🎈', '🔥', '🥳']

interface FireworkItem {
  id: number
  emoji: string
  left: string
  delay: number
}

export default function OverlayPage() {
  const [items, setItems] = useState<FireworkItem[]>([])

  useEffect(() => {
    // 메인 프로세스로부터 폭죽 트리거 이벤트를 수신
    const unsubscribe = window.ipc.on('start-fireworks', (data: any) => {
      triggerFireworks(data?.emojis)
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  const triggerFireworks = (customEmojis?: string[]) => {
    // [Smart Default Logic]
    // 1. 사용자가 직접 고른 이모지가 있다면 최우선 적용
    // 2. 없다면 '오늘의 추천' 이모지가 있는지 확인 (월급날, 기념일 등)
    // 3. 추천도 없다면 기존 '기본 이모지 세트' 사용
    let activeEmojis: string[] | null = customEmojis && customEmojis.length > 0 ? customEmojis : null

    if (!activeEmojis) {
      const rec = getTodayRecommendation()
      if (rec) activeEmojis = rec.emojis
    }

    if (!activeEmojis) {
      activeEmojis = DEFAULT_EMOJIS
    }

    const newItems: FireworkItem[] = []
    // 폭죽 개수를 사용자 요청에 맞춰 최적화 (100 -> 50)
    const count = 50

    for (let i = 0; i < count; i++) {
      newItems.push({
        id: Date.now() + i,
        emoji: activeEmojis[Math.floor(Math.random() * activeEmojis.length)],
        left: `${Math.random() * 90 + 5}%`, // 조금 더 넓게 퍼지도록
        delay: Math.random() * 1.5, // 지연 시간을 늘려 더 오래 지속되는 느낌
      })
    }
    setItems(newItems)

    // 애니메이션 종료 후 클린업 (3.5초 애니메이션 이후 1초 여유)
    setTimeout(() => {
      setItems([])
    }, 4500)
  }

  return (
    <React.Fragment>
      <Head>
        <title>쿠콘팡 - 오버레이</title>
      </Head>
      <div className="relative w-screen h-screen overflow-hidden transparent pointer-events-none">
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute bottom-0 animate-popcorn flex items-center justify-center"
            style={{
              left: item.left,
              animationDelay: `${item.delay}s`,
              fontSize: `${Math.random() * 20 + 20}px`,
              '--tx': `${(Math.random() - 0.5) * 300}px`,
              '--ty': `${-(Math.random() * 400 + 400)}px`,
              '--tr': `${(Math.random() - 0.5) * 720}deg`,
            } as any}
          >
            {item.emoji}
          </div>
        ))}
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
        .animate-popcorn {
          animation: popcorn 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}} />
    </React.Fragment>
  )
}
