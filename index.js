require("dotenv").config()
const express = require("express")
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

redis.on("connect", () => {
  console.log("Conectado ao Redis com sucesso!")
})

redis.on("error", (err) => {
  console.error("Erro na conexão com Redis:", err)
})

const IGNORED_METHODS = ["OPTIONS", "HEAD"]

app.use(async (req, res) => {
  try {
    if (IGNORED_METHODS.includes(req.method)) {
      return res.status(200).json({
        message: "method ignored",
      })
    }

    const requestData = {
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      timestamp: new Date().toISOString(),
    }

    await redis.lpush("requests:queue", JSON.stringify(requestData))

    res.status(200).json({
      message: "message queued",
    })
  } catch (error) {
    console.error("Erro ao salvar requisição:", error)
    res.status(500).json({
      error: "Erro ao processar requisição",
    })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
