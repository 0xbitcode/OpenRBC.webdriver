import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const {
    CHROME_COMMAND,
    CHROME_DEBUGGING_PORT,
} = process.env

const command = CHROME_COMMAND
const args = [`--remote-debugging-port=${CHROME_DEBUGGING_PORT}`]

const processChrome = spawn(command, args)

processChrome.stdout.on(
    'data',
    (data) => {
        const log = data.toString()
        processChromeLog(log)
        console.info(log)
    }
)

processChrome.stderr.on(
    'data',
    (err) => {
        const log = err.toString()
        processChromeLog(log)
        console.error(log)
    }
)

processChrome.on(
    'close',
    (code) => { console.log(`Chrome exit code: ${code}`) }
)

process.on(
    'SIGINT',
    () => {
        console.log('interrupt signal, closing chrome...')
        processChrome.kill('SIGINT')
        process.exit()
    }
)

const processChromeLog =
    (log) => {
        if (log.includes(`DevTools listening on ws://127.0.0.1:${CHROME_DEBUGGING_PORT}`)) {
            try {
                const ws = captureListeningWebSocket(log)
                overwriteEnvFile(ws)
            } catch (err) {
                console.error('err: something went wrong with capturing the ws')
                console.error(`err: ${err}\n`)
            }
        }
    }

const captureListeningWebSocket =
    (log) => {
        const pattern = /ws:\/\/[^\s]+/
        const match = log.match(pattern)
        return match[0]
    }

const overwriteEnvFile =
    (ws) => {
        const envFilePath = path.resolve(__dirname, '.env')
        let envFileContent = readFileSync(envFilePath).toString()
        envFileContent = envFileContent.replace(/^BROWSER_WS_ENDPOINT=.*/m, `BROWSER_WS_ENDPOINT=${ws}`)
        writeFileSync(envFilePath, envFileContent, 'utf-8')
    }
