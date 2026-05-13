import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table,
  Button,
  Space,
  DatePicker,
  Select,
  Input,
  Row,
  Col,
  Typography,
  Badge,
  Tooltip,
  message,
} from 'antd'
import {
  SearchOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  EyeOutlined,
  BellOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import type { Fiche, FicheFilters, StatutFiche, TypeFiche, Employe } from '../services/api'
import { getFiches, getEmployes, getSetting } from '../services/api'
import StatusBadge from './StatusBadge'
import FicheDetail from './FicheDetail'
import ExportModal from './ExportModal'

const { RangePicker } = DatePicker
const { Text } = Typography

const FicheTable: React.FC = () => {
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [employes, setEmployes] = useState<Employe[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  // Filters
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null])
  const [statut, setStatut] = useState<StatutFiche | ''>('')
  const [client, setClient] = useState('')
  const [employeId, setEmployeId] = useState<number | ''>('')
  const [typeFiche, setTypeFiche] = useState<TypeFiche | ''>('')

  // Modals
  const [selectedFicheId, setSelectedFicheId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  // New-fiche notifications
  const [newFichesNotif, setNewFichesNotif] = useState<Fiche[]>([])
  const knownIdsRef = useRef<Set<number>>(new Set())
  const notifInitializedRef = useRef(false)

  async function loadEmployes() {
    try {
      const data = await getEmployes()
      setEmployes(data)
    } catch {
      // silently fail
    }
  }

  const loadFiches = useCallback(async (filters?: FicheFilters) => {
    setLoading(true)
    try {
      const currentFilters: FicheFilters = filters || {
        date_debut: dateRange[0]?.format('YYYY-MM-DD'),
        date_fin: dateRange[1]?.format('YYYY-MM-DD'),
        statut: statut || undefined,
        client: client || undefined,
        employe_id: employeId || undefined,
        type_fiche: typeFiche || undefined,
      }
      const data = await getFiches(currentFilters)
      setFiches(data)
      setTotal(data.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement'
      message.error(`Erreur: ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [dateRange, statut, client, employeId])

  const loadFichesRef = useRef(loadFiches)
  useEffect(() => { loadFichesRef.current = loadFiches }, [loadFiches])

  // Background notification check — fetches ALL fiches (no filter) to detect new ones
  const checkNewFiches = useCallback(async () => {
    try {
      const data = await getFiches({})
      if (!notifInitializedRef.current) {
        notifInitializedRef.current = true
        knownIdsRef.current = new Set(data.map(f => f.id))
        return
      }
      const newOnes = data.filter(f => !knownIdsRef.current.has(f.id))
      if (newOnes.length > 0) {
        setNewFichesNotif(prev => {
          const existingIds = new Set(prev.map(f => f.id))
          return [...prev, ...newOnes.filter(f => !existingIds.has(f.id))]
        })
      }
      knownIdsRef.current = new Set(data.map(f => f.id))
    } catch { /* ignore */ }
  }, [])

  const checkNewFichesRef = useRef(checkNewFiches)
  useEffect(() => { checkNewFichesRef.current = checkNewFiches }, [checkNewFiches])

  useEffect(() => {
    loadEmployes()
    checkNewFichesRef.current()
    getSetting('default_statut_filter').then(val => {
      const defaultStatut = (val as StatutFiche | '') || ''
      setStatut(defaultStatut)
      loadFiches({ statut: defaultStatut || undefined })
    }).catch(() => loadFiches())
    const interval = setInterval(() => {
      loadFichesRef.current()
      checkNewFichesRef.current()
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  function handleSearch() {
    const filters: FicheFilters = {}
    if (dateRange[0]) filters.date_debut = dateRange[0].format('YYYY-MM-DD')
    if (dateRange[1]) filters.date_fin = dateRange[1].format('YYYY-MM-DD')
    if (statut) filters.statut = statut
    if (client.trim()) filters.client = client.trim()
    if (employeId) filters.employe_id = employeId
    if (typeFiche) filters.type_fiche = typeFiche
    loadFiches(filters)
  }

  function handleReset() {
    setDateRange([null, null])
    setStatut('')
    setClient('')
    setEmployeId('')
    setTypeFiche('')
    loadFiches({})
  }

  function openDetail(id: number) {
    setSelectedFicheId(id)
    setDetailOpen(true)
  }

  const columns: ColumnsType<Fiche> = [
    {
      title: 'N°',
      dataIndex: 'numero',
      key: 'numero',
      width: 110,
      render: (numero: string | null, record) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {numero ?? `#${record.id}`}
        </Text>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Agent',
      dataIndex: 'employe_nom',
      key: 'employe_nom',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Client',
      dataIndex: 'client',
      key: 'client',
      ellipsis: true,
      render: (client: string) => (
        <Tooltip title={client}>
          <span>{client}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type_fiche',
      key: 'type_fiche',
      width: 100,
      render: (type: TypeFiche) => (
        <Badge
          color={type === 'PROJET' ? 'purple' : 'blue'}
          text={type === 'PROJET' ? 'Projet' : 'Facture'}
        />
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (source: string) => (
        <Badge
          color={source === 'FERRAILLE' ? 'purple' : 'blue'}
          text={source === 'FERRAILLE' ? 'Bureau' : source}
        />
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'statut',
      key: 'statut',
      width: 130,
      render: (statut: StatutFiche) => <StatusBadge statut={statut} />,
      filters: [
        { text: 'En attente', value: 'EN_ATTENTE' },
        { text: 'Traitée', value: 'TRAITEE' },
        { text: 'À revoir', value: 'A_REVOIR' },
      ],
      onFilter: (value, record) => record.statut === value,
    },
    {
      title: 'Commentaire',
      dataIndex: 'commentaire_secretaire',
      key: 'commentaire_secretaire',
      ellipsis: true,
      render: (comment: string | null) =>
        comment ? (
          <Tooltip title={comment}>
            <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
              {comment}
            </Text>
          </Tooltip>
        ) : (
          <Text type="secondary" italic>
            —
          </Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            openDetail(record.id)
          }}
        >
          Voir
        </Button>
      ),
    },
  ]

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          background: '#fff',
          padding: '16px 20px',
          borderRadius: 8,
          marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={7} lg={6}>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                setDateRange(dates ? [dates[0], dates[1]] : [null, null])
              }}
              format="DD/MM/YYYY"
              placeholder={['Date début', 'Date fin']}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Select
              value={statut}
              onChange={(v) => setStatut(v)}
              style={{ width: '100%' }}
              placeholder="Statut"
              allowClear
              options={[
                { value: '', label: 'Tous les statuts' },
                { value: 'EN_ATTENTE', label: 'En attente' },
                { value: 'TRAITEE', label: 'Traitée' },
                { value: 'A_REVOIR', label: 'À revoir' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nom du client..."
              prefix={<SearchOutlined />}
              onPressEnter={handleSearch}
            />
          </Col>
          <Col xs={24} sm={12} md={4} lg={4}>
            <Select
              value={employeId}
              onChange={(v) => setEmployeId(v)}
              style={{ width: '100%' }}
              placeholder="Agent"
              allowClear
              options={[
                { value: '', label: 'Tous les agents' },
                ...employes
                  .filter((e) => e.actif)
                  .map((e) => ({ value: e.id, label: e.nom })),
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Select
              value={typeFiche}
              onChange={(v) => setTypeFiche(v)}
              style={{ width: '100%' }}
              placeholder="Type"
              allowClear
              options={[
                { value: '', label: 'Tous les types' },
                { value: 'FACTURE', label: 'Facture' },
                { value: 'PROJET', label: 'Projet' },
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={4} lg={7}>
            <Space wrap>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                Rechercher
              </Button>
              <Button onClick={handleReset}>Réinitialiser</Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadFiches()}
                loading={loading}
              />
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => setExportOpen(true)}
                danger
              >
                Exporter PDF
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Count */}
      <div style={{ marginBottom: 8, paddingLeft: 4 }}>
        <Text type="secondary">
          {total} fiche{total !== 1 ? 's' : ''} trouvée{total !== 1 ? 's' : ''}
        </Text>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={fiches}
        rowKey="id"
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} sur ${total} fiches`,
        }}
        onRow={(record) => ({
          onClick: () => openDetail(record.id),
          style: { cursor: 'pointer' },
        })}
        rowClassName={(record) => {
          if (record.statut === 'A_REVOIR') return 'row-a-revoir'
          if (record.statut === 'TRAITEE') return 'row-traitee'
          return ''
        }}
        style={{
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      />

      {/* Modals */}
      <FicheDetail
        ficheId={selectedFicheId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onUpdated={() => loadFiches()}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        preselectedId={null}
      />

      {/* New-fiche notification popup */}
      {newFichesNotif.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 1100,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
          padding: '16px 18px 14px 18px',
          minWidth: 290,
          maxWidth: 370,
          borderLeft: '4px solid #1565c0',
          animation: 'slideInRight 0.25s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <BellOutlined style={{ color: '#1565c0', fontSize: 16 }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                  {newFichesNotif.length === 1
                    ? 'Nouvelle fiche reçue'
                    : `${newFichesNotif.length} nouvelles fiches reçues`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {newFichesNotif.slice(0, 4).map(f => (
                  <div key={f.id} style={{
                    fontSize: 12,
                    color: '#444',
                    background: '#f0f4ff',
                    borderRadius: 6,
                    padding: '3px 8px',
                    display: 'flex',
                    gap: 6,
                  }}>
                    <span style={{ fontFamily: 'monospace', color: '#1565c0', fontWeight: 600 }}>
                      {f.numero ?? `#${f.id}`}
                    </span>
                    <span style={{ color: '#666' }}>—</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.client}
                    </span>
                  </div>
                ))}
                {newFichesNotif.length > 4 && (
                  <div style={{ fontSize: 11, color: '#888', paddingLeft: 4 }}>
                    + {newFichesNotif.length - 4} autre{newFichesNotif.length - 4 > 1 ? 's' : ''}…
                  </div>
                )}
              </div>
            </div>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => setNewFichesNotif([])}
              style={{ color: '#aaa', flexShrink: 0, marginTop: -2 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default FicheTable
