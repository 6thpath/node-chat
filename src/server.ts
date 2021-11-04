import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'

import { createSocketIO } from './socket'

const app = express()
app.use(cors())

const httpServer = createServer(app)
createSocketIO(httpServer)

const PORT = process.env.PORT || process.env.API_PORT || 4000
httpServer.listen({ port: PORT }, () => {
  console.log(`Server ready at port ${PORT}`)
})
