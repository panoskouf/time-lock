import { Request, Response, NextFunction } from 'express'
import { TimeLockEntryData, TimeLockEntryData_P } from '../models/timeLock'
import TimeLock from '../services/timeLock'
import { is_TimeLockEntryData_P_withKey } from '../types/typeGuards'
const tlStore = TimeLock.getInstance()

const serverHealthCheck = (req: Request, res: Response, next: NextFunction) => {
  return res.status(200).json({
    message: 'pong',
  })
}

const add = (req: Request, res: Response) => {
  const data = req.body

  if (!is_TimeLockEntryData_P_withKey(data)) {
    return res.status(400).json({ message: 'Bad Request: wrong schema' })
  }

  const isAdded = tlStore.add(data.key, {
    content: data.content,
    timeToWait: data.timeToWait,
  })

  if (isAdded) {
    return res.status(200).json({ message: 'OK' })
  } else {
    return res.status(409).json({ message: 'a resource with this key already exists' })
  }
}

const update = (req: Request, res: Response) => {
  const data = req.body

  if (!is_TimeLockEntryData_P_withKey(data)) {
    return res.status(400).json({ message: 'Bad Request: wrong schema' })
  }

  const isUpdated = tlStore.update(data.key, {
    content: data.content,
    timeToWait: data.timeToWait,
    releaseDate: data.releaseDate,
  })

  if (isUpdated === 'S-404') {
    return res.status(404).json({
      message: 'Not Found: resource with given key does not exist',
    })
  } else {
    return res.status(200).json({ message: 'updated' })
  }
}

const getContent = (req: Request, res: Response) => {
  const key = req.query?.key
  if (typeof key != 'string') {
    return res
      .status(400)
      .json({ message: 'Bad Request: missing "key" param of type string' })
  } else {
    const getEntryRetVal = tlStore.getEntry(key)

    if (getEntryRetVal === 'S-404') {
      return res.status(404).json({
        message: 'Not Found: resource with given key does not exist',
      })
    } else if (getEntryRetVal === 'S-412') {
      return res.status(412).json({
        message: 'Precondition Failed: no request to unblock the resource has been made',
      })
    } else if (typeof getEntryRetVal === 'number') {
      return res.status(403).json({
        message: `Forbidden: resource is requested to be available in the future, but is not available yet.`,
        releaseDate: getEntryRetVal,
      })
    } else {
      return res.status(200).json({ message: `OK`, content: getEntryRetVal })
    }
  }
}

const requestΤοUnblockContent = (req: Request, res: Response) => {
  const { key } = req.body
  if (!key || typeof key != 'string') {
    return res.status(400).json({ message: 'Bad Request: wrong schema' })
  } else {
    const unblockRetVal = tlStore.requestToUnblock(key)
    if (unblockRetVal === 'S-404') {
      return res.status(404).json({
        message: 'Not Found: resource with given key does not exist',
      })
    } else {
      return res.status(200).json({ message: `OK`, releaseDate: unblockRetVal })
    }
  }
}

const blockContent = (req: Request, res: Response) => {
  const { key } = req.body
  if (!key || typeof key != 'string') {
    return res.status(400).json({ message: 'Bad Request: wrong schema' })
  } else {
    const blockRetVal = tlStore.block(key)
    if (blockRetVal === 'S-404') {
      return res.status(404).json({
        message: 'Not Found: resource with given key does not exist',
      })
    } else {
      return res.status(200).json({ message: 'OK' })
    }
  }
}

const getInfo = (req: Request, res: Response) => {
  const { key, content } = req.query
  if (!key || typeof key != 'string' || !content || typeof content != 'string') {
    return res.status(400).json({ message: 'Bad Request: wrong schema' })
  } else {
    const infoRetVal = tlStore.info(key, content)
    if (infoRetVal === 'S-404') {
      return res.status(404).json({
        message: 'Not Found: resource with given key does not exist',
      })
    } else if (!infoRetVal) {
      return res.status(403).json({
        message:
          'Forbidden: content must be the same as content of resource with given key.',
      })
    } else {
      return res.status(200).json(infoRetVal)
    }
  }
}

export default {
  serverHealthCheck,
  add,
  update,
  getContent,
  requestΤοUnblockContent,
  blockContent,
  getInfo,
}
