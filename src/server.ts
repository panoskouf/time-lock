import http from 'http'
import express, { Request, Response, NextFunction } from 'express'
import logging from './config/logging'
import config from './config/config'
import timelockRoutes from './routes/timeLock'
const AppInTestMode = config.testMode
import { testModeMiddleware } from './tests/middleware'

const NAMESPACE = 'Server'
const router = express()

router.use((req, res, next) => {
  /** Log the req */
  logging.info(
    NAMESPACE,
    `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`,
  )

  res.on('finish', () => {
    /** Log the res */
    logging.info(
      NAMESPACE,
      `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`,
    )
  })

  next()
})

/** Parse the body of the request */
router.use(express.urlencoded({ extended: true }))
router.use(express.json())

/** Rules of our API */
router.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  )

  if (req.method == 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET')
    return res.status(200).json({})
  }

  next()
})

/** Routes */
if (AppInTestMode) {
  // before each request
  router.use(testModeMiddleware)
}

router.use('/api/timelock', timelockRoutes)

/** Error handling */
router.use((req: Request, res: Response, next: NextFunction) => {
  const error = new Error('Not found')

  res.status(404).json({
    message: error.message,
  })
})

const httpServer = http.createServer(router)

export default httpServer.listen(config.server.port, () =>
  logging.info(
    NAMESPACE,
    `Server is running ${config.server.hostname}:${config.server.port}`,
  ),
)
