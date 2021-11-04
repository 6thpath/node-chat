import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
// @ts-ignore
import eiows from 'eiows'
// @ts-ignore
import randomAnimalName from 'random-animal-name'

import { PostMessagePayload } from 'type'

enum Events {
  SET_NAME = 'set-name',
  GET_CLIENTS = 'get-clients',
  POST_MESSAGE = 'post-message',
  NOTIFY = 'notify',
}

const messageLengthLimit = 1000
const defaultRoom = 'general'
// const defaultNamespace = '/'

export function createSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: '/ws',
    cors: {
      origin: '*',
    },
    wsEngine: eiows.Server,
    perMessageDeflate: {
      threshold: 32768,
    },
  })

  const getClients = async (room: string) => {
    const clients = await io.in(room).fetchSockets()

    return clients.map(({ id, data }) => ({
      id: id,
      ...data,
    }))
  }

  io.on('connection', async (socket) => {
    socket.data = {
      name: randomAnimalName(),
      joinedAt: +new Date(),
    }
    socket.join(defaultRoom)
    const joinedRooms = [defaultRoom]

    const clients = await getClients(defaultRoom)
    socket.to(defaultRoom).emit(Events.GET_CLIENTS, clients)
    socket.to(defaultRoom).emit(Events.NOTIFY, `${socket.data.name} joined`)

    socket.on(Events.GET_CLIENTS, async (room) => {
      const clients = await getClients(room ?? defaultRoom)

      socket.emit(Events.GET_CLIENTS, clients)
    })

    socket.on(Events.POST_MESSAGE, ({ message, room }: PostMessagePayload) => {
      if (!message || !room) {
        return
      }

      const isJoined = joinedRooms.indexOf(room) > -1

      if (isJoined && message.length <= messageLengthLimit) {
        const payload = {
          message,
          from: {
            id: socket.id,
            name: socket.data.name,
          },
          sentAt: +new Date(),
        }

        io.to(room).emit(Events.POST_MESSAGE, {
          payload,
        })
      } else {
        socket.emit(Events.POST_MESSAGE, {
          error: !isJoined
            ? `You don't have permission to send message to this room`
            : 'Message too long',
        })
      }
    })

    socket.on('disconnecting', async () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit(Events.NOTIFY, `${socket.data.name} has left`)
        }
      }
    })

    socket.on('disconnect', async () => {
      for (let i = 0, len = joinedRooms.length; i < len; i++) {
        if (joinedRooms[i] !== socket.id) {
          const clients = await getClients(joinedRooms[i])
          socket.to(joinedRooms[i]).emit(Events.GET_CLIENTS, clients)
        }
      }
    })
  })
}
