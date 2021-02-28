import { TimeUnits } from '../utils/msUtils'

export interface TimeLockEntryData {
  content: string
  /**
   * How much to wait from the point the user requested the information
   */
  timeToWait: TimeUnits
  /**
   * A value in ms which if surpassed Date.now() the content is allowed to be returned.
   */
  releaseDate?: number | undefined
}

export interface TimeLockEntryData_P {
  content: string
  timeToWait: Partial<TimeUnits>
  releaseDate?: number | undefined
}

export interface KVStore<T> {
  [key: string]: T
}
