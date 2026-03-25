import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import frFR from 'antd/locale/fr_FR'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import App from './App'
import './index.css'

// Set dayjs locale to French
dayjs.locale('fr')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={frFR}
      theme={{
        token: {
          colorPrimary: '#1a1a2e',
          colorLink: '#1a1a2e',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Layout: {
            headerBg: '#1a1a2e',
            siderBg: '#1a1a2e',
          },
          Menu: {
            darkItemBg: '#1a1a2e',
            darkSubMenuItemBg: '#16213e',
          },
          Table: {
            headerBg: '#fafafa',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
