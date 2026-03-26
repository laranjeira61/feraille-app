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
} from '../services/api'
import { isApiConfigured } from '../store/settings'

const { Title, Text } = Typography

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

  useEffect(() => {
    loadEmployes()
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
    </div>
  )
}

export default AdminPage
