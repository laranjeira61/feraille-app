import React, { useState } from 'react'
import {
  Modal,
  Tabs,
  DatePicker,
  InputNumber,
  Button,
  Space,
  Typography,
  message,
  Alert,
} from 'antd'
import { FilePdfOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { exportPdf } from '../services/api'

const { Text } = Typography
const { RangePicker } = DatePicker

interface ExportModalProps {
  open: boolean
  onClose: () => void
  preselectedId?: number | null
}

type ExportMode = 'single' | 'month' | 'range'

const ExportModal: React.FC<ExportModalProps> = ({ open, onClose, preselectedId }) => {
  const [activeTab, setActiveTab] = useState<ExportMode>('single')
  const [loading, setLoading] = useState(false)

  // Single fiche
  const [singleId, setSingleId] = useState<number | null>(preselectedId || null)

  // Month
  const [selectedMonth, setSelectedMonth] = useState<Dayjs | null>(dayjs())

  // Range
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs(),
  ])

  React.useEffect(() => {
    if (preselectedId) {
      setSingleId(preselectedId)
      setActiveTab('single')
    }
  }, [preselectedId])

  async function handleExport() {
    setLoading(true)
    try {
      let buffer: ArrayBuffer
      let defaultName: string

      if (activeTab === 'single') {
        if (!singleId) {
          message.warning('Veuillez saisir un ID de fiche')
          return
        }
        buffer = await exportPdf({ mode: 'single', ids: [singleId] })
        defaultName = `fiche_${singleId}.pdf`
      } else if (activeTab === 'month') {
        if (!selectedMonth) {
          message.warning('Veuillez sélectionner un mois')
          return
        }
        const monthStr = selectedMonth.format('YYYY-MM')
        buffer = await exportPdf({ mode: 'month', month: monthStr })
        defaultName = `fiches_${monthStr}.pdf`
      } else {
        // range
        if (!dateRange[0] || !dateRange[1]) {
          message.warning('Veuillez sélectionner une plage de dates')
          return
        }
        const debut = dateRange[0].format('YYYY-MM-DD')
        const fin = dateRange[1].format('YYYY-MM-DD')
        buffer = await exportPdf({ mode: 'range', date_debut: debut, date_fin: fin })
        defaultName = `fiches_${debut}_au_${fin}.pdf`
      }

      // Save via Electron or fallback
      const electronAPI = (window as unknown as {
        electronAPI?: {
          savePdf?: (b: ArrayBuffer, n: string) => Promise<{ success: boolean; canceled?: boolean; error?: string }>
        }
      }).electronAPI

      if (electronAPI?.savePdf) {
        const result = await electronAPI.savePdf(buffer, defaultName)
        if (result.success) {
          message.success('PDF enregistré avec succès')
          onClose()
        } else if (!result.canceled) {
          message.error(result.error || 'Erreur lors de l\'enregistrement du PDF')
        }
      } else {
        // Fallback for non-Electron context
        const blob = new Blob([buffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName
        a.click()
        URL.revokeObjectURL(url)
        message.success('PDF téléchargé')
        onClose()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'export PDF'
      message.error(`Erreur export PDF: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const tabItems = [
    {
      key: 'single',
      label: 'Fiche unique',
      children: (
        <Space direction="vertical" style={{ width: '100%', paddingTop: 16 }}>
          <Text>Numéro de la fiche à exporter :</Text>
          <InputNumber
            value={singleId}
            onChange={(v) => setSingleId(v)}
            placeholder="ID de la fiche"
            min={1}
            style={{ width: '100%' }}
            size="large"
          />
          {preselectedId && (
            <Alert
              type="info"
              showIcon
              message={`Fiche #${preselectedId} présélectionnée`}
            />
          )}
        </Space>
      ),
    },
    {
      key: 'month',
      label: 'Par mois',
      children: (
        <Space direction="vertical" style={{ width: '100%', paddingTop: 16 }}>
          <Text>Sélectionnez le mois à exporter :</Text>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(d) => setSelectedMonth(d)}
            format="MMMM YYYY"
            style={{ width: '100%' }}
            size="large"
          />
          <Text type="secondary">
            Toutes les fiches du mois sélectionné seront exportées dans un seul PDF.
          </Text>
        </Space>
      ),
    },
    {
      key: 'range',
      label: 'Plage de dates',
      children: (
        <Space direction="vertical" style={{ width: '100%', paddingTop: 16 }}>
          <Text>Sélectionnez la plage de dates :</Text>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange([dates[0], dates[1]])
              } else {
                setDateRange([null, null])
              }
            }}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
            size="large"
          />
          <Text type="secondary">
            Toutes les fiches dans la plage de dates sélectionnée seront exportées.
          </Text>
        </Space>
      ),
    },
  ]

  return (
    <Modal
      title={
        <Space>
          <FilePdfOutlined style={{ color: '#ff4d4f' }} />
          Exporter en PDF
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={520}
      footer={
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={loading}
            size="large"
            danger
          >
            Générer le PDF
          </Button>
          <Button onClick={onClose} size="large">
            Annuler
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as ExportMode)}
        items={tabItems}
      />
    </Modal>
  )
}

export default ExportModal
