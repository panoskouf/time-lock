import { expect } from 'chai'
import server from '../server'
import request from 'supertest'
import { write as flushMockData } from '../db/fileSync'
import { KVStore, TimeLockEntryData } from '../models/timeLock'

/* -------------------------------- HELPERS -------------------------------- */
const now = Date.now()
const past = now - 100
const AnHourFromNow = now + 60 * 60 * 1000
const ttwDefault = { days: 0, hours: 0, minutes: 0, seconds: 0 }

// the 3 required values
const _key = 'newKey'
const _content = 'content for newKey'
const _timeToWait = ttwDefault

// routes
const baseUrl = '/api/timeLock'
const getContentUrl = `${baseUrl}/getContent`
const addUrl = `${baseUrl}/add`
const updateUrl = `${baseUrl}/update`
const reqUnblockEntryUrl = `${baseUrl}/requestToUnblockContent`
const getInfoUrl = `${baseUrl}/getInfo`
const blockContentUrl = `${baseUrl}/blockContent`

// manipulate Server's mock data externally
function setPrecondition(whichMock: string): void {
  const testEntry = {
    key: 'test',
    content: 'mockContentForKey_test',
    timeToWait: ttwDefault,
  }

  const mockDataStates: { [key: string]: KVStore<TimeLockEntryData> } = {
    empty: {},
    containsNonBlockedEntry: {
      test: { ...testEntry, releaseDate: past },
      extraEntry: testEntry,
      extraEntry2: testEntry,
    },
    releaseDateUndefined: { locked: { ...testEntry }, extraKey: testEntry },
    releaseDateInTheFuture: {
      future: { ...testEntry, releaseDate: AnHourFromNow },
      extraKey2: testEntry,
    },
    containsEntryToBeUpdated: {
      [_key]: { content: _content, timeToWait: _timeToWait },
      extraKey2: testEntry,
      extraKey: testEntry,
    },
    containsInfoKey: {
      infoKey: {
        content: 'contentForInfoKey',
        timeToWait: { ...ttwDefault, days: 10 },
        releaseDate: AnHourFromNow,
      },
      extraKey2: testEntry,
      extraKey: testEntry,
    },
    containsBlockedEntry: {
      blockedEntry: {
        content: 'contentForBlockedEntry',
        timeToWait: { ...ttwDefault, minutes: 10 },
        /* releaseDate not set */
      },
      extraKey2: testEntry,
      extraKey: testEntry,
    },
  }

  if (mockDataStates[whichMock] === undefined) {
    throw Error('No predefined mock data state exists for this key')
  }
  flushMockData(JSON.stringify(mockDataStates[whichMock]))
}

/**
 * @param objKeys check exact keys of response.body &
 * check exact length of keys of response.body (objKeys.length)
 * @param status check response.status,
 * @param response
 */
function commonChecks(response: request.Response, objKeys: string[], status: number) {
  expect(response.body).to.have.keys(objKeys)
  expect(Object.keys(response.body).length).to.be.eql(objKeys.length)
  expect(response.status).to.equal(status)
}

const checksRequiredParameters = async (url: string, method: string) => {
  if (method != 'post' && method != 'put') {
    throw new Error(`unsupported method ${method}`)
  }

  let payload: any = { /* key, */ content: _content, timeToWait: _timeToWait }
  let response = await request(server)[method](url).send(payload)
  commonChecks(response, ['message'], 400)

  payload = { key: _key, /* content, */ timeToWait: _timeToWait }
  response = await request(server)[method](url).send(payload)
  commonChecks(response, ['message'], 400)

  payload = { key: _key, content: _content /* , timeToWait */ }
  response = await request(server)[method](url).send(payload)
  commonChecks(response, ['message'], 400)

  payload = { key: 'any', content: 'any', timeToWait: _timeToWait }
  response = await request(server)[method](url).send(payload)
  expect(response.status).to.not.equal(400)
}

/* -------------------------------- TESTS -------------------------------- */

describe(`GET ${getInfoUrl}`, () => {
  beforeEach(() => {
    setPrecondition('containsInfoKey')
  })

  it('returns 400 Bad Request if key parameter is missing', async () => {
    let response = await request(server).get(
      `${getInfoUrl}?key=infoKey${'&' /* 'content=contentForInfoKey' */}`,
    )
    commonChecks(response, ['message'], 400)

    response = await request(server).get(
      `${getInfoUrl}${'?' /* key=infoKey& */}content=contentForInfoKey`,
    )
    commonChecks(response, ['message'], 400)

    response = await request(server).get(`${getInfoUrl}?key=any&content=any`)
    expect(response.status).to.not.equal(400)
  })

  it('returns 404 if key is not found', async () => {
    const response = await request(server).get(
      `${getInfoUrl}?key=non-existing-key&content=any`,
    )
    commonChecks(response, ['message'], 404)
  })

  it('returns 403 if given content is not the same ', async () => {
    const response = await request(server).get(
      `${getInfoUrl}?key=infoKey&content=wrongContent`,
    )
    commonChecks(response, ['message'], 403)
  })

  it('returns the all the information of entry if given content is the same to what is stored', async () => {
    const response = await request(server).get(
      `${getInfoUrl}?key=infoKey&content=contentForInfoKey`,
    )
    // releaseDate may or may not exist
    expect(response.body).to.include.keys(['content', 'timeToWait'])
    expect(Object.keys(response.body).length).to.be.within(2, 3)
    expect(response.status).to.equal(200)
  })
})

describe(`GET ${getContentUrl}`, () => {
  beforeEach(() => {
    // empty mock data
    setPrecondition('empty')
  })

  /**
   * An entry with a releaseDate field set to the past is unlocked and
   * its content can be retrieved instantly
   */
  it("returns the entry's content if releaseDate is in the past", async () => {
    setPrecondition('containsNonBlockedEntry')
    const response = await request(server).get(`${getContentUrl}?key=test`)
    commonChecks(response, ['message', 'content'], 200)
  })

  it('returns 400 Bad Request if key parameter is missing', async () => {
    const response = await request(server).get(`${getContentUrl}`)
    commonChecks(response, ['message'], 400)
  })

  it('returns 404 if key is not found', async () => {
    const response = await request(server).get(`${getContentUrl}?key=someKey`)
    commonChecks(response, ['message'], 404)
  })

  it('returns 412 Precondition Failed if no request to unblock this specific entry has been made. Entry is still blocked', async () => {
    setPrecondition('releaseDateUndefined')
    const response = await request(server).get(`${getContentUrl}?key=locked`)
    commonChecks(response, ['message'], 412)
  })

  it('returns 403 and the date that the content will be accessible if a request to unblock the content has been made', async () => {
    setPrecondition('releaseDateInTheFuture')
    const response = await request(server).get(`${getContentUrl}?key=future`)
    expect(response.status).to.equal(403)
    commonChecks(response, ['message', 'releaseDate'], 403)
  })
})

describe(`POST ${addUrl}`, () => {
  beforeEach(() => {
    setPrecondition('empty')
  })

  it('returns 400 Bad Request if any of the required data are missing', async () => {
    await checksRequiredParameters(addUrl, 'post')
  })

  it('returns 409 Conflict if entry with given key already exists', async () => {
    let payload = { key: _key, content: _content, timeToWait: _timeToWait }
    let response = await request(server).post(addUrl).send(payload)
    commonChecks(response, ['message'], 200)

    response = await request(server).post(addUrl).send(payload)
    commonChecks(response, ['message'], 409)
  })
})

describe(`PUT ${updateUrl}`, () => {
  beforeEach(() => {
    setPrecondition('containsEntryToBeUpdated')
  })

  it('returns 400 Bad Request if any of the required data are missing', async () => {
    return await checksRequiredParameters(updateUrl, 'put')
  })

  it('returns 404 if key is not found', async () => {
    const payload = {
      key: 'non-existing-key',
      content: _content,
      timeToWait: _timeToWait,
    }
    const response = await request(server).put(updateUrl).send(payload)
    commonChecks(response, ['message'], 404)
  })

  it('is possible to update all properties', async () => {
    const newEntryPayload = {
      key: _key,
      content: 'new content',
      timeToWait: { ...ttwDefault, hours: 1423 },
      releaseDate: AnHourFromNow,
    }
    let response = await request(server).put(updateUrl).send(newEntryPayload)
    commonChecks(response, ['message'], 200)

    response = await request(server).get(
      `${getInfoUrl}?key=${_key}&content=${newEntryPayload.content}`,
    )

    commonChecks(response, ['content', 'timeToWait', 'releaseDate'], 200)
    const { content, timeToWait, releaseDate } = response.body
    const { content: c, timeToWait: t, releaseDate: r } = newEntryPayload
    // check retrieved values are equal to the ones that were sent to be updated
    expect(content).to.be.eql(c)
    expect(timeToWait).to.deep.equal(t)
    expect(releaseDate).to.be.eql(r)
  })
})

describe(`PATCH ${reqUnblockEntryUrl}`, () => {
  beforeEach(() => {
    setPrecondition('containsBlockedEntry')
  })

  it('returns 400 Bad Request if key is missing', async () => {
    let payload: any = { /* key: _key, */ whatever: '' }
    let response = await request(server).patch(reqUnblockEntryUrl).send(payload)
    commonChecks(response, ['message'], 400)

    payload = { key: _key, whatever: '' }
    response = await request(server).patch(reqUnblockEntryUrl).send(payload)
    expect(response.status).to.not.equal(400)
  })

  it('returns 404 if key is not found', async () => {
    let payload = { key: 'non-existing-key', whatever: '' }
    let response = await request(server).patch(reqUnblockEntryUrl).send(payload)
    commonChecks(response, ['message'], 404)
  })

  it('returns 200 and sets the releaseDate', async () => {
    let response = await request(server).get(
      `${getInfoUrl}?key=blockedEntry&content=contentForBlockedEntry`,
    )
    expect(response.body).to.not.haveOwnProperty('releaseDate')

    let payload = { key: 'blockedEntry', whatever: '' }
    response = await request(server).patch(reqUnblockEntryUrl).send(payload)
    commonChecks(response, ['message', 'releaseDate'], 200)
  })
})

describe(`PATCH ${blockContentUrl}`, () => {
  beforeEach(() => {
    setPrecondition('containsNonBlockedEntry')
  })

  it('returns 400 Bad Request if key parameter is missing', async () => {
    let payload: any = { /* key: _key, */ whatever: '' }
    let response = await request(server).patch(blockContentUrl).send(payload)
    commonChecks(response, ['message'], 400)

    payload = { key: 'test', whatever: '' }
    response = await request(server).patch(blockContentUrl).send(payload)
    expect(response.status).to.not.equal(400)
  })

  it('returns 404 if key is not found', async () => {
    const payload = {
      key: 'non-existing-key',
      content: _content,
      timeToWait: _timeToWait,
    }
    const response = await request(server).patch(blockContentUrl).send(payload)
    commonChecks(response, ['message'], 404)
  })

  it('blocks the content', async () => {
    let response = await request(server).get(
      `${getInfoUrl}?key=test&content=mockContentForKey_test`,
    )
    expect(response.body).to.haveOwnProperty('releaseDate')

    const payload = { key: 'test' }
    response = await request(server).patch(blockContentUrl).send(payload)
    commonChecks(response, ['message'], 200)

    response = await request(server).get(
      `${getInfoUrl}?key=test&content=mockContentForKey_test`,
    )
    expect(response.body).to.not.haveOwnProperty('releaseDate')
  })
})
