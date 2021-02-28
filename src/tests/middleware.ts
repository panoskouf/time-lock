import { Request, Response, NextFunction } from 'express'
import TimeLock from '../services/timeLock'
import config from '../config/config'
const AppInTestMode = config.testMode

/**
 *
 * In normal execution memory state is always synced with our file.
 * In test mode we write mock data using the setPrecondition function
 * while bypassing the memory state, due to this reason we need to load
 * this change into memory before each request.
 */
const testModeMiddleware = function (req: Request, res: Response, next: NextFunction) {
  if (AppInTestMode) {
    // loadMockDataBeforeEachRequest
    TimeLock.getInstance().load()
  }

  next()
}

export { testModeMiddleware }
