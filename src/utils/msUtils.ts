export interface TimeUnits {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function convertMS(ms: number): TimeUnits {
  var d, h, m, s
  s = Math.floor(ms / 1000)
  m = Math.floor(s / 60)
  s = s % 60
  h = Math.floor(m / 60)
  m = m % 60
  d = Math.floor(h / 24)
  h = h % 24
  return { days: d, hours: h, minutes: m, seconds: s }
}

const daysToMS = (d: number) => d * 24 * 60 * 60 * 1000
const hoursToMS = (h: number) => h * 60 * 60 * 1000
const minutesToMS = (m: number) => m * 60 * 1000
const secondsToMS = (s: number) => s * 1000

export function convertTimeUnitsToMS(timeInUnits: TimeUnits): number {
  return (
    daysToMS(timeInUnits.days) +
    hoursToMS(timeInUnits.hours) +
    minutesToMS(timeInUnits.minutes) +
    secondsToMS(timeInUnits.seconds)
  )
}

export function assertTimeUnits(timeUnitsObj: Partial<TimeUnits>): TimeUnits {
  return { days: 0, hours: 0, minutes: 0, seconds: 0, ...timeUnitsObj }
}
