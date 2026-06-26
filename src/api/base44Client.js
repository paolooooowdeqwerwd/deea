import { createClient } from "@base44/sdk"
import { appParams } from "@/lib/app-params"

const { appId, token, functionsVersion, appBaseUrl } = appParams

const makeEntityStub = () => ({
  list: async () => {
    throw new Error("Base44 non configurato")
  },
  create: async () => {
    throw new Error("Base44 non configurato")
  },
  update: async () => {
    throw new Error("Base44 non configurato")
  },
  delete: async () => {
    throw new Error("Base44 non configurato")
  },
  filter: async () => {
    throw new Error("Base44 non configurato")
  },
})

export const base44 = appId
  ? createClient({
      appId,
      token,
      functionsVersion,
      requiresAuth: false,
      appBaseUrl,
      options: {
        onError: () => {}
      }
    })
  : {
      auth: {
        me: async () => {
          throw new Error("Base44 non configurato")
        },
        logout: () => {},
        redirectToLogin: () => {},
      },
      entities: new Proxy(
        {},
        {
          get: () => makeEntityStub()
        }
      ),
    }
