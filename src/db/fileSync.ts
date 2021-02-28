import fs from 'fs'
import config from '../config/config'
const AppInTestMode = config.testMode

/* use this instead of a db for now */

const __dirname = fs.realpathSync('.')
const filename = AppInTestMode ? 'mockData.json' : 'data.json'

/**
 * handle read **Synchronously**
 */
export const read = () => {
  return fs.readFileSync(`${__dirname}/${filename}`, {
    encoding: 'utf-8',
  })
}

/**
 * handle write **Synchronously**
 */
export const write = (data: string) => {
  fs.writeFileSync(`${__dirname}/${filename}`, data, {
    encoding: 'utf-8',
  })
}
