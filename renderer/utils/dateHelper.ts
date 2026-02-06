export interface Recommendation {
    dateLabel: string
    emojis: string[]
    reason: string
}

/**
 * 특정 날짜가 공휴일이거나 주말인지 확인 (간이 로직)
 * 실제 서비스라면 공휴일 API 연동이 필요하나, 기획안에 따라 주말 우선 처리
 */
const isHolidayOrWeekend = (date: Date): boolean => {
    const day = date.getDay()
    return day === 0 || day === 6 // 토요일(6), 일요일(0)
}

/**
 * 월급날(23일) 계산 로직
 * 23일이 주말/공휴일이면 그 전 평일로 이동
 */
export const getPayday = (date: Date): Date => {
    let d = new Date(date.getFullYear(), date.getMonth(), 23)
    while (isHolidayOrWeekend(d)) {
        d.setDate(d.getDate() - 1)
    }
    return d
}

/**
 * 오늘의 추천 이모지 및 정보를 반환
 */
export const getTodayRecommendation = (date: Date = new Date()): Recommendation | null => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const dayOfWeek = date.getDay() // 0(일) ~ 6(토)

    // 1. 월급날 (최우선)
    const payday = getPayday(date)
    if (day === payday.getDate() && month === (payday.getMonth() + 1)) {
        return {
            dateLabel: '월급날 💰',
            emojis: ['💰', '💸', '💳', '🥳', '🍖'],
            reason: '월급날엔 동료들과 맛있는 거 드세요!'
        }
    }

    // 2. 고정 기념일 (양력)
    const fixedHolidays: Record<string, Recommendation> = {
        '1-1': { dateLabel: '신정', emojis: ['☀️', '🌅', '🎍', '🧧'], reason: '새해 복 많이 받으세요!' },
        '2-14': { dateLabel: '발렌타인데이', emojis: ['🍫', '💝', '🎁', '🍭'], reason: '달콤한 하루 되세요!' },
        '3-1': { dateLabel: '삼일절', emojis: ['🇰🇷', '🙌', '🕯️', '🕊️'], reason: '대한독립만세!' },
        '3-14': { dateLabel: '화이트데이', emojis: ['🍬', '🍭', '🤍', '🎁'], reason: '사랑을 전하세요!' },
        '4-14': { dateLabel: '블랙데이', emojis: ['🍜', '🖤', '🥢'], reason: '자장면 드셨나요?' },
        '5-1': { dateLabel: '근로자의 날', emojis: ['😴', '🏖️', '✈️', '🍺'], reason: '늘 수고하시는 여러분, 푹 쉬세요!' },
        '5-5': { dateLabel: '어린이날', emojis: ['🎈', '🎡', '🎠', '🧸'], reason: '동심으로 돌아가는 날!' },
        '5-8': { dateLabel: '어버이날', emojis: ['💐', '🌹', '👵', '👴'], reason: '감사의 마음을 전하세요.' },
        '5-15': { dateLabel: '스승의날', emojis: ['🍎', '📝', '🏫', '💐'], reason: '존경의 마음을 담아!' },
        '6-6': { dateLabel: '현충일', emojis: ['🇰🇷', '🙏', '🕯️'], reason: '잊지 않겠습니다.' },
        '7-17': { dateLabel: '제헌절', emojis: ['📜', '⚖️', '🇰🇷'], reason: '대한민국 법의 날!' },
        '8-15': { dateLabel: '광복절', emojis: ['🇰🇷', '✨', '🎆', '🕊️'], reason: '광복을 축하합니다!' },
        '10-3': { dateLabel: '개천절', emojis: ['🇰🇷', '☁️', '🐻', '🧄'], reason: '하늘이 열린 날!' },
        '10-9': { dateLabel: '한글날', emojis: ['📖', '✍️', '🇰🇷', '📜'], reason: '한글은 사랑입니다.' },
        '11-11': { dateLabel: '빼빼로데이', emojis: ['🍫', '🥖', '🎁', '❤️'], reason: '막대과자 하나씩 어때요?' },
        '12-25': { dateLabel: '크리스마스', emojis: ['🎄', '🎅', '❄️', '🔔'], reason: '메리 크리스마스!' },
        '12-31': { dateLabel: '연말', emojis: ['🔚', '🎆', '🥂', '👏'], reason: '한 해 동안 고생 많으셨습니다!' }
    }

    const key = `${month}-${day}`
    if (fixedHolidays[key]) return fixedHolidays[key]

    // 3. 주간 패턴 (금요일 오후)
    if (dayOfWeek === 5 && date.getHours() >= 13) {
        return {
            dateLabel: '불금 시작!',
            emojis: ['💃', '🕺', '🍻', '🚗', '⛺'],
            reason: '즐거운 주말을 위해 퇴근 준비!'
        }
    }

    return null
}
