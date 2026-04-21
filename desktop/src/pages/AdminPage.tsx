import React, { useState, useEffect } from 'react'
import {
  Typography,
  Table,
  Button,
  Input,
  Space,
  Switch,
  Form,
  message,
  Popconfirm,
  Tag,
  Divider,
  Card,
  Alert,
  Row,
  Col,
} from 'antd'
import {
  UserAddOutlined,
  SaveOutlined,
  LinkOutlined,
  PictureOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Employe } from '../services/api'
import {
  getEmployes,
  createEmploye,
  updateEmploye,
  deleteEmploye,
  getApiUrl,
  setApiUrl,
  getSetting,
  setSetting,
} from '../services/api'
import { isApiConfigured } from '../store/settings'

const { Title, Text } = Typography

function PinRow({ label, settingKey, defaultVal }: { label: string; settingKey: string; defaultVal: string }) {
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSetting(settingKey).then(v => { if (v) setPin(v) })
  }, [settingKey])

  async function handleSave() {
    if (!pin.trim()) { message.warning('Entrez un code PIN'); return }
    setSaving(true)
    try {
      await setSetting(settingKey, pin.trim())
      message.success('Code PIN enregistré')
    } catch {
      message.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Row gutter={8} align="middle" style={{ marginBottom: 12 }}>
      <Col style={{ width: 260 }}>
        <Text>{label}</Text>
      </Col>
      <Col>
        <Input.Password
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder={`ex: ${defaultVal}`}
          maxLength={8}
          style={{ width: 150 }}
          onPressEnter={handleSave}
        />
      </Col>
      <Col>
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          Enregistrer
        </Button>
      </Col>
      <Col>
        <Text type="secondary" style={{ fontSize: 12 }}>Par défaut : {defaultVal}</Text>
      </Col>
    </Row>
  )
}

function PinSetting() {
  return (
    <>
      <PinRow label="Code PIN accès Administration :" settingKey="admin_access_pin" defaultVal="0000" />
      <PinRow label="Code PIN suppression de fiche :" settingKey="delete_pin" defaultVal="1234" />
    </>
  )
}

interface EditableEmploye extends Employe {
  editing?: boolean
  editNom?: string
}

const AdminPage: React.FC = () => {
  const [employes, setEmployes] = useState<EditableEmploye[]>([])
  const [loading, setLoading] = useState(false)
  const [newNom, setNewNom] = useState('')
  const [addingEmploye, setAddingEmploye] = useState(false)

  // API URL setting
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl())
  const [apiUrlSaved, setApiUrlSaved] = useState(false)

  // Logo setting
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    loadEmployes()
    getSetting('logo').then(val => {
      if (val) { setLogoBase64(val); setLogoPreview(val) }
    })
  }, [])

  async function loadEmployes() {
    setLoading(true)
    try {
      const data = await getEmployes()
      setEmployes(data.map((e) => ({ ...e, editing: false, editNom: e.nom })))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors du chargement'
      message.error(`Erreur: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddEmploye() {
    if (!newNom.trim()) {
      message.warning('Veuillez saisir un nom')
      return
    }
    setAddingEmploye(true)
    try {
      const employe = await createEmploye(newNom.trim())
      setEmployes((prev) => [...prev, { ...employe, editing: false, editNom: employe.nom }])
      setNewNom('')
      message.success(`Employé "${employe.nom}" ajouté avec succès`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'ajout'
      message.error(`Erreur: ${msg}`)
    } finally {
      setAddingEmploye(false)
    }
  }

  function startEdit(id: number) {
    setEmployes((prev) =>
      prev.map((e) => (e.id === id ? { ...e, editing: true } : e))
    )
  }

  function cancelEdit(id: number) {
    setEmployes((prev) =>
      prev.map((e) => (e.id === id ? { ...e, editing: false, editNom: e.nom } : e))
    )
  }

  async function saveEdit(id: number, newNom: string) {
    if (!newNom.trim()) {
      message.warning('Le nom ne peut pas être vide')
      return
    }
    try {
      await updateEmploye(id, { nom: newNom.trim() })
      setEmployes((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, nom: newNom.trim(), editing: false, editNom: newNom.trim() } : e
        )
      )
      message.success('Employé mis à jour')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      message.error(`Erreur: ${msg}`)
    }
  }

  async function toggleActif(id: number, actif: boolean) {
    try {
      if (!actif) {
        // Deactivating (soft delete)
        await deleteEmploye(id)
      } else {
        await updateEmploye(id, { actif: true })
      }
      setEmployes((prev) =>
        prev.map((e) => (e.id === id ? { ...e, actif } : e))
      )
      message.success(actif ? 'Employé réactivé' : 'Employé désactivé')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur'
      message.error(`Erreur: ${msg}`)
    }
  }

  function handleSaveApiUrl() {
    if (!apiUrlInput.trim()) {
      message.warning('L\'URL ne peut pas être vide')
      return
    }
    setApiUrl(apiUrlInput.trim())
    window.dispatchEvent(new Event('api-url-changed'))
    setApiUrlSaved(true)
    message.success('URL API sauvegardée. Reconnexion...')
    setTimeout(() => {
      setApiUrlSaved(false)
      loadEmployes()
    }, 1500)
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setLogoPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  async function handleLogoSave() {
    if (!logoPreview) return
    setLogoLoading(true)
    try {
      await setSetting('logo', logoPreview)
      setLogoBase64(logoPreview)
      message.success('Logo sauvegardé')
    } catch {
      message.error('Erreur lors de la sauvegarde du logo')
    } finally {
      setLogoLoading(false)
    }
  }

  async function handleLogoDelete() {
    setLogoLoading(true)
    try {
      await setSetting('logo', '')
      setLogoBase64(null)
      setLogoPreview(null)
      message.success('Logo supprimé')
    } catch {
      message.error('Erreur lors de la suppression')
    } finally {
      setLogoLoading(false)
    }
  }

  const columns: ColumnsType<EditableEmploye> = [
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
      render: (nom: string, record) => {
        if (record.editing) {
          return (
            <Input
              value={record.editNom}
              onChange={(e) =>
                setEmployes((prev) =>
                  prev.map((emp) =>
                    emp.id === record.id ? { ...emp, editNom: e.target.value } : emp
                  )
                )
              }
              onPressEnter={() => saveEdit(record.id, record.editNom || '')}
              autoFocus
            />
          )
        }
        return <Text strong>{nom}</Text>
      },
    },
    {
      title: 'Statut',
      dataIndex: 'actif',
      key: 'actif',
      width: 120,
      render: (actif: boolean) => (
        <Tag color={actif ? 'green' : 'red'}>{actif ? 'Actif' : 'Inactif'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space>
          {record.editing ? (
            <>
              <Button
                type="primary"
                size="small"
                onClick={() => saveEdit(record.id, record.editNom || '')}
              >
                Valider
              </Button>
              <Button size="small" onClick={() => cancelEdit(record.id)}>
                Annuler
              </Button>
            </>
          ) : (
            <Button size="small" onClick={() => startEdit(record.id)}>
              Modifier
            </Button>
          )}
          <Popconfirm
            title={record.actif ? 'Désactiver cet employé ?' : 'Réactiver cet employé ?'}
            onConfirm={() => toggleActif(record.id, !record.actif)}
            okText="Confirmer"
            cancelText="Annuler"
          >
            <Switch
              checked={record.actif}
              checkedChildren="Actif"
              unCheckedChildren="Inactif"
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ maxWidth: 800 }}>
      <Title level={4} style={{ marginBottom: 20, color: '#1a1a2e' }}>
        Administration
      </Title>

      {/* Employee management */}
      <Card
        title="Gestion des employés"
        style={{ marginBottom: 24 }}
        extra={
          <Button icon={<UserAddOutlined />} onClick={loadEmployes} size="small">
            Actualiser
          </Button>
        }
      >
        {/* Add employee form */}
        <Row gutter={8} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              placeholder="Nom du nouvel employé..."
              onPressEnter={handleAddEmploye}
              size="middle"
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={handleAddEmploye}
              loading={addingEmploye}
            >
              Ajouter
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={employes}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          locale={{ emptyText: 'Aucun employé enregistré' }}
        />
      </Card>

      <Card
        title={<Space><PictureOutlined />Logo tablette</Space>}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={24} align="middle">
          <Col flex="200px">
            <div style={{
              width: 180, height: 100, border: '2px dashed #d9d9d9',
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: '#fafafa', overflow: 'hidden'
            }}>
              {logoPreview
                ? <img src={logoPreview} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>Aucun logo{'\n'}(affiche "TicketPro")</Text>
              }
            </div>
          </Col>
          <Col flex="auto">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Format recommandé : PNG transparent, 400×200px max. Le logo s'affichera sur la tablette en haut à gauche.
              </Text>
              <Space>
                <label htmlFor="logo-upload">
                  <Button icon={<UploadOutlined />} onClick={() => document.getElementById('logo-upload')?.click()}>
                    Choisir une image
                  </Button>
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileChange}
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleLogoSave}
                  loading={logoLoading}
                  disabled={!logoPreview || logoPreview === logoBase64}
                >
                  Enregistrer
                </Button>
                {logoBase64 && (
                  <Popconfirm
                    title="Supprimer le logo ?"
                    onConfirm={handleLogoDelete}
                    okText="Supprimer"
                    cancelText="Annuler"
                  >
                    <Button danger icon={<DeleteOutlined />}>Supprimer</Button>
                  </Popconfirm>
                )}
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      <Divider />

      {/* API URL Configuration */}
      <Card
        title={
          <Space>
            <LinkOutlined />
            Configuration de l&apos;API
          </Space>
        }
      >
        {!isApiConfigured() && (
          <Alert
            type="warning"
            showIcon
            message="URL API non configurée"
            description="Veuillez saisir l'adresse du serveur API pour que l'application fonctionne correctement."
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical">
          <Form.Item
            label="URL du serveur API"
            help="Exemple: http://192.168.1.10:3000 ou http://votre-serveur.local:3000"
          >
            <Row gutter={8}>
              <Col flex="auto">
                <Input
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  placeholder="http://192.168.1.10:3000"
                  prefix={<LinkOutlined />}
                  size="middle"
                  onPressEnter={handleSaveApiUrl}
                />
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveApiUrl}
                  loading={apiUrlSaved}
                >
                  Enregistrer
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ fontSize: 12 }}>
          URL actuelle : <strong>{getApiUrl()}</strong>
        </Text>
      </Card>

      <Card title="Sécurité — Code PIN suppression" style={{ marginTop: 24 }}>
        <PinSetting />
      </Card>
    </div>
  )
}

export default AdminPage
