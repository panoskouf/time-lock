import { TimeUnits } from '../utils/msUtils'
import { TimeLockEntryData_P } from '../models/timeLock'
import { TimeLockEntryData_P_withKey } from './requestTypes'

/* typeGuards only check if properties are defined,
  not if they are assigned to the correct type */

// TODO use io-ts

export function is_TimeUnits(obj: any): obj is TimeUnits {
  return (
    typeof obj === 'object' &&
    (obj.hasOwnProperty('days') ||
      obj.hasOwnProperty('hours') ||
      obj.hasOwnProperty('minutes') ||
      obj.hasOwnProperty('seconds'))
  )
}

export function is_TimeLockEntryData_P(obj: any): obj is TimeLockEntryData_P {
  return (
    typeof obj === 'object' &&
    obj.hasOwnProperty('content') &&
    is_TimeUnits(obj.timeToWait)
  )
}

export function is_TimeLockEntryData_P_withKey(
  obj: any,
): obj is TimeLockEntryData_P_withKey {
  return (
    typeof obj === 'object' && obj.hasOwnProperty('key') && is_TimeLockEntryData_P(obj)
  )
}
