import express from 'express'
import controller from '../controllers/timeLock'

const router = express.Router()

router.get('/ping', controller.serverHealthCheck)

router.get('/getContent', controller.getContent)
router.post('/add', controller.add)
router.put('/update', controller.update)
router.patch('/requestToUnblockContent', controller.requestΤοUnblockContent)
router.patch('/blockContent', controller.blockContent)
router.get('/getInfo', controller.getInfo)

// todo front-end
router.get('/', (req, res) => {
  res.send('Hello from time-lock service')
})

export = router
