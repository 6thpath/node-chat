import socket from 'socket.io'
import { v4 } from 'uuid'

import { deleteMessage, store, storeMessage } from './store'

const events = {
  SET_NAME: 'set-name',
  GET_USER_LIST: 'get-user-list',
  POST_MESSAGE: 'post-message',
  DELETE_MESSAGE: 'delete-message',
  GET_MESSAGES: 'get-messages',
}

export function createSocketIO(httpServer) {
  const ChatIO = socket(httpServer, { path: '/chat' })

  ChatIO.on('connect', (user) => {
    store.users[user.id] = {
      id: user.id,
      name: `User #${Object.keys(store.users).length}`,
      online: true,
      joinedAt: +new Date(),
    }

    user.on(events.SET_NAME, (name) => {
      // Updates user's name
      store.users[user.id].name = name

      // Broadcast user's updated name
      user.broadcast.emit(events.GET_USER_LIST, store.users)
    })

    user.on(events.GET_USER_LIST, () => {
      // Returns user list
      user.emit(events.GET_USER_LIST, store.users)
    })

    user.on(events.GET_MESSAGES, ({ fromId = undefined, limit = 0 }) => {
      const totalMessages = store.messages.length
      const fromIndex =
        fromId !== undefined ? store.messages.findIndex((msg) => msg.id === fromId) : -1
      let payload = {
        messages: [],
        total: totalMessages,
      }

      if (fromIndex > -1) {
        const sliceFrom = fromIndex - limit <= 0 ? 0 : fromIndex - limit

        payload.messages = store.messages.slice(sliceFrom, fromIndex)
      }

      user.emit(events.GET_MESSAGES, payload)
    })

    user.on(events.POST_MESSAGE, (message) => {
      const messageObj = {
        id: v4(),
        from: {
          id: user.id,
          username: store.users[user.id].name,
        },
        message,
        sentAt: +new Date(),
      }

      storeMessage(messageObj)

      // Publishes new message to everyone
      ChatIO.emit(events.POST_MESSAGE, {
        total: store.messages.length,
        newMessage: messageObj,
      })
    })

    user.on(events.DELETE_MESSAGE, (msgId) => {
      deleteMessage({ userId: user.id, msgId })

      ChatIO.emit(events.DELETE_MESSAGE, {
        total: store.messages.length,
        deletedMessageId: msgId,
      })
    })

    user.on('disconnect', () => {
      store.users[user.id].online = false
      store.users[user.id].leftAt = +new Date()

      // Publishes disconnected user info
      user.broadcast.emit(events.GET_USER_LIST, store.users[user.id])
    })
  })
}
