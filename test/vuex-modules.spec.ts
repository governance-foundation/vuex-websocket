/**
 * Created by championswimmer on 23/07/17.
 */

import { assert, expect, should } from 'chai'
import Vue from 'vue'
import store from '../src/Store'
import Vuex from 'vuex'
import VuexWebSocket from "../src/index"
import localForage from "localforage"
import MockStorage from "vuex-persist"
import VuexPersistence from "vuex-persist"


const objectStore: { [key: string]: any } = {}
const MockForageStorage = {
  _driver: 'objectStorage',
  _support: true,
  _initStorage() { },
  clear() { },
  getItem<T>(key: string): Promise<T> {
    return Promise.resolve<T>(objectStore[key])
  },
  iterate() { },
  key() { },
  keys() { },
  length() { },
  removeItem() { },
  setItem<T>(key: string, data: T): Promise<T> {
    return Promise.resolve<T>((objectStore[key] = data))
  }
}


Vue.use(Vuex)
// @ts-ignore
localForage.defineDriver(MockForageStorage as any)
localForage.setDriver('objectStorage')

const mockStorage = new MockStorage()
const vuexPersist = new VuexPersistence<any>({
  storage: mockStorage,
  reducer: (state) => ({ dog: state.dog }),
  filter: (mutation) => (mutation.type === 'dogBark')
})


Vue.use(VuexWebSocket, "ws://localhost:8110/", {
  store: store,
  format: "json",
  reconnection: true,
  namespace_prefix: "VuexWebSocket/", //will not be used on events that have store_actions mapping specified
  store_actions: {
    SOCKET_ONOPEN: [
      {
        method: "commit",
        target: "VuexWebSocket/SOCKET_ONOPEN",
      },
    ],
    SOCKET_ONCLOSE: {
      method: "commit",
      target: "VuexWebSocket/SOCKET_ONCLOSE",
      msg: "test",
    },
    SOCKET_ONERROR: { target: "VuexWebSocket/SOCKET_ONERROR" },
    SOCKET_ONMESSAGE: [
      { target: "VuexWebSocket/SOCKET_ONMESSAGE" },
      { method: "dispatch", target: "Message/messageRecieve" },
    ],
    SOCKET_RECONNECT: "VuexWebSocket/SOCKET_RECONNECT",
    SOCKET_RECONNECT_ERROR: "VuexWebSocket/SOCKET_RECONNECT_ERROR",
  },
});


// const getSavedStore = () => JSON.parse((vuexPersist.storage as any).getItem('vuex') as string)

// describe('Storage: MockStorage, Test: modules', () => {
//   it('should persist specified module', () => {
//     store.commit('dogBark')
//     expect(getSavedStore().dog.barks).to.equal(1)
//   })
//   it('should not persist unspecified module', () => {
//     store.commit('catMew')
//     expect(getSavedStore().cat).to.be.undefined
//   })
// })
