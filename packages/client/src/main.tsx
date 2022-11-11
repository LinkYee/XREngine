import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'

import { LoadingCircle } from '@xrengine/client-core/src/components/LoadingCircle' //@ts-ignore
import { wxShare } from './wxapi'

;(globalThis as any).process = { env: { ...(import.meta as any).env, APP_ENV: (import.meta as any).env.MODE } }

wxShare()
const Engine = React.lazy(() => import('./engine'))

const App = () => {
  return (
    <Suspense fallback={<LoadingCircle message={'元宇宙空间启动中...'} />}>
      <Engine />
    </Suspense>
  )
}

const container = document.getElementById('loginroot')
const root = createRoot(container!)
root.render(<App />)
