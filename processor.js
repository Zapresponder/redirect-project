require("dotenv").config()
const axios = require("axios")
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)
const TARGET_URL = "https://polite-unicorn-69.webhook.cool"

redis.on("connect", () => {
  console.log("Conectado ao Redis com sucesso!")
})

redis.on("error", (err) => {
  console.error("Erro na conexão com Redis:", err)
})

async function processRequest(requestData) {
  try {
    const { url, method, headers, body, query, timestamp } = requestData

    const filteredHeaders = { ...headers }
    delete filteredHeaders.host
    delete filteredHeaders["content-length"]

    const fullUrl = `${TARGET_URL}${url}`

    console.log(`Processando: ${method} ${fullUrl}`)

    const response = await axios({
      method: method.toLowerCase(),
      url: fullUrl,
      headers: filteredHeaders,
      data: body,
      params: query,
    })

    console.log(`✓ Sucesso: ${method} ${fullUrl} - Status: ${response.status}`)
    return { success: true, status: response.status, url: fullUrl }
  } catch (error) {
    const status = error.response ? error.response.status : "N/A"
    console.error(
      `✗ Erro ao processar requisição: ${error.message} - Status: ${status}`
    )
    return { success: false, error: error.message, status, requestData }
  }
}

async function processQueue() {
  try {
    const queueSize = await redis.llen("requests:queue")
    console.log(`\nIniciando processamento de ${queueSize} requisições...\n`)

    let processed = 0
    let succeeded = 0
    let failed = 0

    while (true) {
      const item = await redis.rpop("requests:queue")

      if (!item) {
        break
      }

      const requestData = JSON.parse(item)
      const result = await processRequest(requestData)

      processed++

      if (result.success) {
        succeeded++
      } else {
        failed++
        const dlqItem = {
          ...result.requestData,
          error: result.error,
          errorStatus: result.status,
          failedAt: new Date().toISOString(),
        }
        await redis.lpush("requests:dlq", JSON.stringify(dlqItem))
      }

      console.log(`Progresso: ${processed}/${queueSize}\n`)
    }

    const dlqSize = await redis.llen("requests:dlq")

    console.log("\n========================================")
    console.log("Processamento concluído!")
    console.log(`Total: ${processed}`)
    console.log(`Sucesso: ${succeeded}`)
    console.log(`Falhas: ${failed}`)
    console.log(`Itens na DLQ: ${dlqSize}`)
    console.log("========================================\n")

    process.exit(0)
  } catch (error) {
    console.error("Erro fatal:", error)
    process.exit(1)
  }
}

processQueue()
