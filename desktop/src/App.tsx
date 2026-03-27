import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  Layout,
  Menu,
  Typography,
  Space,
  Badge,
  Tooltip,
  Button,
  notification,
  Alert,
} from 'antd'
import {
  FileTextOutlined,
  SettingOutlined,
  BellOutlined,
  ApiOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import FichesPage from './pages/FichesPage'
import AdminPage from './pages/AdminPage'
import { getApiUrl } from './services/api'
import { isApiConfigured } from './store/settings'

const { Header, Sider, Content } = Layout
const { Text } = Typography

// Update notification bell
function UpdateBell() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    const electronAPI = (window as unknown as {
      electronAPI?: {
        onUpdateAvailable?: (cb: () => void) => void
        onUpdateDownloaded?: (cb: () => void) => void
        installUpdate?: () => void
        removeUpdateListeners?: () => void
      }
    }).electronAPI

    if (electronAPI?.onUpdateAvailable) {
      electronAPI.onUpdateAvailable(() => {
        setUpdateAvailable(true)
        notification.info({
          message: 'Mise à jour disponible',
          description: 'Une nouvelle version est en cours de téléchargement...',
          duration: 5,
        })
      })
    }

    if (electronAPI?.onUpdateDownloaded) {
      electronAPI.onUpdateDownloaded(() => {
        setUpdateDownloaded(true)
        notification.success({
          message: 'Mise à jour prête',
          description: 'La mise à jour a été téléchargée. Cliquez sur la cloche pour installer.',
          duration: 0,
          key: 'update-ready',
        })
      })
    }

    return () => {
      electronAPI?.removeUpdateListeners?.()
    }
  }, [])

  function handleInstallUpdate() {
    const electronAPI = (window as unknown as {
      electronAPI?: { installUpdate?: () => void }
    }).electronAPI
    electronAPI?.installUpdate?.()
  }

  if (updateDownloaded) {
    return (
      <Tooltip title="Mise à jour prête — Cliquer pour installer et redémarrer">
        <Badge dot color="green">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18, color: '#52c41a' }} />}
            onClick={handleInstallUpdate}
            style={{ color: '#fff' }}
          />
        </Badge>
      </Tooltip>
    )
  }

  if (updateAvailable) {
    return (
      <Tooltip title="Téléchargement de la mise à jour en cours...">
        <Badge dot color="orange">
          <ReloadOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
        </Badge>
      </Tooltip>
    )
  }

  return null
}

// Version display
function VersionDisplay() {
  const [version, setVersion] = useState<string>('...')

  useEffect(() => {
    const electronAPI = (window as unknown as {
      electronAPI?: { getVersion?: () => Promise<string> }
    }).electronAPI

    if (electronAPI?.getVersion) {
      electronAPI.getVersion().then((v) => setVersion(v)).catch(() => setVersion('dev'))
    } else {
      setVersion('dev')
    }
  }, [])

  return (
    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
      v{version}
    </Text>
  )
}

// Sidebar menu with active state
function AppSider({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: (v: boolean) => void }) {
  const location = useLocation()

  const selectedKey = location.pathname === '/admin' ? 'admin' : 'fiches'

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={200}
      style={{
        background: '#1a1a2e',
        boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
      }}
      theme="dark"
    >
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: 8,
        }}
      >
        {!collapsed && (
          <Text style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            TicketPro
          </Text>
        )}
      </div>
      <Menu
        theme="dark"
        selectedKeys={[selectedKey]}
        mode="inline"
        style={{ background: '#1a1a2e', borderRight: 0 }}
        items={[
          {
            key: 'fiches',
            icon: <FileTextOutlined />,
            label: <Link to="/">Fiches</Link>,
          },
          {
            key: 'admin',
            icon: <SettingOutlined />,
            label: <Link to="/admin">Administration</Link>,
          },
        ]}
      />
    </Sider>
  )
}

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [apiConfigured, setApiConfigured] = useState(isApiConfigured())
  const [currentApiUrl, setCurrentApiUrl] = useState(getApiUrl())

  useEffect(() => {
    const handleApiUrlChanged = () => {
      setApiConfigured(isApiConfigured())
      setCurrentApiUrl(getApiUrl())
    }
    window.addEventListener('api-url-changed', handleApiUrlChanged)
    return () => window.removeEventListener('api-url-changed', handleApiUrlChanged)
  }, [])

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppSider collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout>
        {/* Top Header */}
        <Header
          style={{
            background: '#1a1a2e',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            height: 56,
            lineHeight: '56px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            TicketPro — Gestion des fiches
          </Text>
          <Space align="center" size={16}>
            <Tooltip title={`API: ${currentApiUrl}`}>
              <Space size={4}>
                <ApiOutlined
                  style={{
                    color: apiConfigured ? '#52c41a' : '#ff4d4f',
                    fontSize: 16,
                  }}
                />
                {!collapsed && (
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                    {currentApiUrl.replace(/^https?:\/\//, '').split('/')[0]}
                  </Text>
                )}
              </Space>
            </Tooltip>
            <UpdateBell />
            <VersionDisplay />
          </Space>
        </Header>

        <Content
          style={{
            padding: '20px 24px',
            background: '#f0f2f5',
            overflow: 'auto',
          }}
        >
          {/* API not configured warning */}
          {!apiConfigured && (
            <Alert
              type="warning"
              showIcon
              message="URL API non configurée"
              description={
                <span>
                  L&apos;URL du serveur API n&apos;est pas configurée. Rendez-vous dans{' '}
                  <Link to="/admin">Administration</Link> pour la configurer.
                </span>
              }
              style={{ marginBottom: 16 }}
              closable
            />
          )}

          <Routes>
            <Route path="/" element={<FichesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  )
}

export default App
