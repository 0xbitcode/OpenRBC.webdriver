import { readdirSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer'

const {
    BROWSER_WS_ENDPOINT,
    DIRECTORY_DUMP,
} = process.env

    ; (
        async () => {
            const browser = await puppeteer.connect({ browserWSEndpoint: BROWSER_WS_ENDPOINT })
            const pages = await browser.pages()
            const page = pages[0]

            await page.setViewport(null)

            page.on('response', (response) => handleResponse(page, response))
        }
    )()

const processingQueue = Promise.resolve()

const handleResponse =
    async (page, response) => {
        processingQueue
            .then(async () => await processResponse(page, response))
            .catch((err) => console.error(err))
    }

const processResponse =
    async (page, response) => {
        const url = response.url()
        if (url.includes('https://www1.royalbank.com/sgw5/omniapi/transaction-presentation-service-v3-dbb')) {
            const request = response.request()
            if (request.method() === 'POST' && request.hasPostData()) {
                try {
                    const account = await getAccount(page)
                    const timeframe = getTimeframe(response)
                    const noFile = getNoFile(account, timeframe)
                    const data = await response.json()

                    const filename = `${account}__${timeframe}__${noFile}.json`
                    writeFileSync(`${DIRECTORY_DUMP}/${filename}`, JSON.stringify(data), 'utf-8')

                    console.info(`dump: ${filename}`)
                } catch (err) {
                    console.error(err)
                }
            }
        }
    }

const getAccount =
    async (page) => {
        const account = await page.$eval(
            '#accountSelector',
            el =>
                Array
                    .from(el.querySelectorAll('span'))
                    .map(span => span.textContent.replace(/\W/g, ''))
                    .join('_')
        )
        return account
    }

const getTimeframe =
    (response) => {
        const postData = response.request().postData()
        const from = JSON.parse(postData).transactionFromDate
        const to = JSON.parse(postData).transactionToDate
        return `${from}_${to}`
    }

const getNoFile =
    (account, timeframe) => {
        const files = readdirSync(DIRECTORY_DUMP)
        const noFiles = files
            .filter((file) => file.includes(`${account}__${timeframe}`))
            .length
        return noFiles
    }
