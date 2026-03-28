import React, { useState, useEffect } from 'react'
import {
  Modal,
  Descriptions,
  Radio,
  Input,
  Button,
  Space,
  Divider,
  Typography,
  message,
  Spin,
  Alert,
  Row,
  Col,
} from 'antd'
import { FilePdfOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Fiche, StatutFiche } from '../services/api'
import { getFiche, updateFiche, exportPdf } from '../services/api'
import StatusBadge from './StatusBadge'

const { Title, Text } = Typography
const { TextArea } = Input

interface FicheDetailProps {
  ficheId: number | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

/** Parse notes_dessin — supports both old single base64 and new JSON array format */
function parseDrawingPages(notesDessin: string | null | undefined): string[] {
  if (!notesDessin) return []
  try {
    const parsed = JSON.parse(notesDessin)
    if (Array.isArray(parsed)) return parsed.filter((p: unknown) => typeof p === 'string' && p.length > 0)
  } catch { /* not JSON — old format */ }
  return [notesDessin]
}

const FicheDetail: React.FC<FicheDetailProps> = ({ ficheId, open, onClose, onUpdated }) => {
  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newStatut, setNewStatut] = useState<StatutFiche>('EN_ATTENTE')
  const [commentaire, setCommentaire] = useState('')
  const [drawingPageIdx, setDrawingPageIdx] = useState(0)

  useEffect(() => {
    if (open && ficheId !== null) {
      loadFiche(ficheId)
    }
  }, [open, ficheId])

  async function loadFiche(id: number) {
    setLoading(true)
    setError(null)
    try {
      const data = await getFiche(id)
      setFiche(data)
      setNewStatut(data.statut)
      setCommentaire(data.commentaire_secretaire || '')
      setDrawingPageIdx(0)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement de la fiche'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!fiche) return
    setSaving(true)
    try {
      await updateFiche(fiche.id, {
        statut: newStatut,
        commentaire_secretaire: commentaire,
      })
      message.success('Fiche mise à jour avec succès')
      onUpdated()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      message.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleExportPdf() {
    if (!fiche) return
    setExporting(true)
    try {
      const buffer = await exportPdf({ mode: 'single', ids: [fiche.id] })
      const electronAPI = (window as unknown as { electronAPI?: { savePdf?: (b: ArrayBuffer, n: string) => Promise<{ success: boolean; canceled?: boolean; error?: string }> } }).electronAPI
      if (electronAPI?.savePdf) {
        const result = await electronAPI.savePdf(buffer, `fiche_${fiche.id}.pdf`)
        if (result.success) {
          message.success('PDF enregistré avec succès')
        } else if (!result.canceled) {
          message.error(result.error || 'Erreur lors de l\'enregistrement')
        }
      } else {
        // Fallback: download via browser
        const blob = new Blob([buffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fiche_${fiche.id}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'export PDF'
      message.error(msg)
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('DD/MM/YYYY')
  }

  const footer = (
    <Space>
      <Button
        type="primary"
        icon={<FilePdfOutlined />}
        onClick={handleExportPdf}
        loading={exporting}
        disabled={!fiche}
      >
        Exporter en PDF
      </Button>
      <Button
        type="primary"
        icon={<SaveOutlined />}
        onClick={handleSave}
        loading={saving}
        disabled={!fiche}
        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
      >
        Enregistrer
      </Button>
      <Button onClick={onClose}>Fermer</Button>
    </Space>
  )

  return (
    <Modal
      title={
        fiche
          ? `Fiche #${fiche.id} — ${formatDate(fiche.date)} — ${fiche.client}`
          : 'Détail de la fiche'
      }
      open={open}
      onCancel={onClose}
      width={860}
      footer={footer}
      destroyOnClose
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Chargement de la fiche..." />
        </div>
      )}

      {error && !loading && (
        <Alert type="error" message="Erreur" description={error} showIcon />
      )}

      {fiche && !loading && (
        <>
          {/* Info grid */}
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Employé">{fiche.employe_nom}</Descriptions.Item>
            <Descriptions.Item label="Date">{formatDate(fiche.date)}</Descriptions.Item>
            <Descriptions.Item label="Client">{fiche.client}</Descriptions.Item>
            <Descriptions.Item label="Source">{fiche.source}</Descriptions.Item>
            <Descriptions.Item label="Statut actuel" span={2}>
              <StatusBadge statut={fiche.statut} />
            </Descriptions.Item>
          </Descriptions>

          {/* Drawing pages */}
          {(() => {
            const pages = parseDrawingPages(fiche.notes_dessin)
            if (pages.length === 0) return null
            const idx = Math.min(drawingPageIdx, pages.length - 1)
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <Title level={5} style={{ margin: 0 }}>Dessin / Notes visuelles</Title>
                  {pages.length > 1 && (
                    <Space>
                      <Button size="small" disabled={idx === 0} onClick={() => setDrawingPageIdx(i => Math.max(0, i - 1))}>‹</Button>
                      <Text style={{ fontSize: 13 }}>Page {idx + 1} / {pages.length}</Text>
                      <Button size="small" disabled={idx === pages.length - 1} onClick={() => setDrawingPageIdx(i => Math.min(pages.length - 1, i + 1))}>›</Button>
                    </Space>
                  )}
                </div>
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, marginBottom: 16, background: '#fafafa', textAlign: 'center' }}>
                  <img
                    src={pages[idx]}
                    alt={`Dessin page ${idx + 1}`}
                    style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 4 }}
                  />
                </div>
              </>
            )
          })()}

          {/* Text notes */}
          {fiche.notes_texte && (
            <>
              <Title level={5} style={{ marginBottom: 8 }}>Notes texte</Title>
              <div
                style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 16,
                  background: '#fafafa',
                  whiteSpace: 'pre-wrap',
                }}
              >
                <Text>{fiche.notes_texte}</Text>
              </div>
            </>
          )}

          <Divider />

          {/* Status change section */}
          <Title level={5} style={{ marginBottom: 12 }}>Traitement de la fiche</Title>
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Text strong style={{ marginRight: 12 }}>Nouveau statut :</Text>
              <Radio.Group
                value={newStatut}
                onChange={(e) => setNewStatut(e.target.value as StatutFiche)}
                buttonStyle="solid"
              >
                <Radio.Button value="EN_ATTENTE" style={{ color: newStatut === 'EN_ATTENTE' ? '#fff' : '#fa8c16' }}>
                  En attente
                </Radio.Button>
                <Radio.Button value="TRAITEE" style={{ color: newStatut === 'TRAITEE' ? '#fff' : '#52c41a' }}>
                  Traitée
                </Radio.Button>
                <Radio.Button value="A_REVOIR" style={{ color: newStatut === 'A_REVOIR' ? '#fff' : '#ff4d4f' }}>
                  À revoir
                </Radio.Button>
              </Radio.Group>
            </Col>
            <Col span={24}>
              <Text strong>Commentaire secrétaire :</Text>
              <TextArea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={3}
                placeholder="Ajouter un commentaire sur cette fiche..."
                style={{ marginTop: 8 }}
              />
            </Col>
          </Row>
        </>
      )}
    </Modal>
  )
}

export default FicheDetail
