import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'

import { createSocketIO } from './socketIO'

// Initializes application
const app = express()

// Enable cors
app.use(cors())

// Create http server
const httpServer = createServer(app)

// Initialize socketIO
createSocketIO(httpServer)

// Listen to HTTP and WebSocket server
const PORT = process.env.PORT || process.env.API_PORT
httpServer.listen({ port: PORT }, () => {
  console.log(`Server ready at port ${PORT}`)
})
