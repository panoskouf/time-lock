import { convertTimeUnitsToMS, assertTimeUnits } from '../utils/msUtils'
import { Status412, Status423 } from '../types/types'
import { read as loadData, write as saveData } from '../db/fileSync'
import { KVStore, TimeLockEntryData, TimeLockEntryData_P } from '../models/timeLock'

export default class TimeLock {
  private static instance: TimeLock

  private constructor() {}

  public static getInstance(): TimeLock {
    if (!TimeLock.instance) {
      TimeLock.instance = new TimeLock()
      TimeLock.instance.load()
    }

    return TimeLock.instance
  }

  private store: KVStore<TimeLockEntryData> = {}

  public add(key: string, value: TimeLockEntryData_P) {
    if (this.found(key)) {
      return false
    }

    const newValue: TimeLockEntryData = {
      ...value,
      timeToWait: assertTimeUnits(value.timeToWait),
    }

    this.store[key] = newValue
    this.save()
    return true
  }

  public update(key: string, value: TimeLockEntryData_P) {
    if (this.found(key) === false) {
      return 'S-404'
    }

    const newValue: TimeLockEntryData = {
      ...value,
      timeToWait: assertTimeUnits(value.timeToWait),
    }

    this.store[key] = newValue
    this.save()
    return true
  }

  /**
   * @returns {(string | Status412 | Status423 | number)}
   * **Status404** if requested resource is not found, or
   * **Status412** if requested resource is not expected to be available in the future, or a
   * **string** containing the content of the requested resource, or a
   * **number** containing the ms representing the date the resource's
   *  content will be available (maybe 423 ?)
   */
  public getEntry(key: string): string | Status412 | Status423 | number {
    if (this.found(key) === false) {
      return 'S-404'
    }

    const now = Date.now()
    const { content, releaseDate } = this.store[key]

    if (releaseDate === undefined) {
      return 'S-412'
    } else {
      const resourceIsAvailable = now > releaseDate

      if (resourceIsAvailable) {
        return content
      } else {
        return releaseDate
      }
    }
  }

  public requestToUnblock(key: string) {
    if (this.found(key) === false) {
      return 'S-404'
    }

    const now = Date.now()
    const { content, timeToWait } = this.store[key]

    // if resource was already set to be available in the future, start timer again from now
    const releaseDate = now + convertTimeUnitsToMS(timeToWait)
    this.update(key, { content, releaseDate: releaseDate, timeToWait })

    return releaseDate
  }

  public block(key: string) {
    if (this.found(key) === false) {
      return 'S-404'
    }

    this.store[key].releaseDate = undefined
    this.save()
    return true
  }

  public info(key: string, content: string) {
    if (this.found(key) === false) {
      return 'S-404'
    }

    if (this.store[key].content === content) {
      return this.store[key]
    } else {
      return false
    }
  }

  // state
  public load() {
    const dataStr = loadData()
    this.store = JSON.parse(dataStr)
  }

  public save() {
    const data = JSON.stringify(this.store)
    saveData(data)
  }

  // utils
  private found(key: string) {
    return this.store[key] != undefined
  }
}
