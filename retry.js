require("dotenv").config()
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)

redis.on("connect", () => {
  console.log("Conectado ao Redis com sucesso!")
})

redis.on("error", (err) => {
  console.error("Erro na conexão com Redis:", err)
})

async function migrateDLQToQueue() {
  try {
    const dlqSize = await redis.llen("requests:dlq")

    if (dlqSize === 0) {
      console.log("\nNenhum item na DLQ para migrar.\n")
      process.exit(0)
    }

    console.log(`\nMigrando ${dlqSize} itens da DLQ para a fila principal...\n`)

    let migrated = 0

    while (true) {
      const item = await redis.rpop("requests:dlq")

      if (!item) {
        break
      }

      const dlqData = JSON.parse(item)

      const requestData = {
        url: dlqData.url,
        method: dlqData.method,
        headers: dlqData.headers,
        body: dlqData.body,
        query: dlqData.query,
        timestamp: dlqData.timestamp,
      }

      await redis.lpush("requests:queue", JSON.stringify(requestData))

      migrated++
      console.log(`Migrado: ${migrated}/${dlqSize}`)
    }

    const newQueueSize = await redis.llen("requests:queue")
    const newDlqSize = await redis.llen("requests:dlq")

    console.log("\n========================================")
    console.log("Migração concluída!")
    console.log(`Itens migrados: ${migrated}`)
    console.log(`Fila principal: ${newQueueSize}`)
    console.log(`DLQ: ${newDlqSize}`)
    console.log("========================================\n")

    process.exit(0)
  } catch (error) {
    console.error("Erro fatal:", error)
    process.exit(1)
  }
}

migrateDLQToQueue()
