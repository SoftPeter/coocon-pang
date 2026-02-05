import React, { useState, useEffect } from 'react'
import Head from 'next/head'

const EMOJIS = ['🎉', '🎊', '✨', '🍕', '🍩', '🎈', '🔥', '🥳']

interface FireworkItem {
  id: number
  emoji: string
  left: string
  delay: number
}

export default function OverlayPage() {
  const [items, setItems] = useState<FireworkItem[]>([])

  useEffect(() => {
    window.ipc.on('start-fireworks', (data: any) => {
      triggerFireworks()
    })
  }, [])

  const triggerFireworks = () => {
    const newItems: FireworkItem[] = []
    for (let i = 0; i < 40; i++) {
      newItems.push({
        id: Date.now() + i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        left: `${Math.random() * 80 + 10}%`, // 너무 가장자리에 치우치지 않게
        delay: Math.random() * 0.8,
      })
    }
    setItems(newItems)

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
              fontSize: `${Math.random() * 20 + 20}px`, // 20~40px 사이로 크기 고정
              '--tx': `${(Math.random() - 0.5) * 300}px`, // 무작위 좌우 편차
              '--ty': `${-(Math.random() * 400 + 400)}px`, // 무작위 상승 높이
              '--tr': `${(Math.random() - 0.5) * 720}deg`, // 무작위 회전
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
