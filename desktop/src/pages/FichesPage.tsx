import React from 'react'
import { Typography } from 'antd'
import FicheTable from '../components/FicheTable'

const { Title } = Typography

const FichesPage: React.FC = () => {
  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={4} style={{ marginBottom: 16, color: '#1a1a2e' }}>
        Gestion des fiches
      </Title>
      <FicheTable />
    </div>
  )
}

export default FichesPage
