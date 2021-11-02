export const store = {
  users: {},
  messages: [],
}

export function storeMessage(messageObj) {
  if (store.messages.length > 100) {
    store.messages.shift()
    store.messages = [...store.messages, messageObj]
  }
}

export function deleteMessage({ userId, msgId }) {
  store.messages = store.messages.filter((msg) => msg.id === msgId && msg.from.id === userId)
}
