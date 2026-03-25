import React from 'react'
import { Tag } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import type { StatutFiche } from '../services/api'

interface StatusBadgeProps {
  statut: StatutFiche
  size?: 'default' | 'small'
}

const STATUS_CONFIG: Record<StatutFiche, { color: string; label: string; icon: React.ReactNode }> = {
  EN_ATTENTE: {
    color: 'orange',
    label: 'En attente',
    icon: <ClockCircleOutlined />,
  },
  TRAITEE: {
    color: 'green',
    label: 'Traitée',
    icon: <CheckCircleOutlined />,
  },
  A_REVOIR: {
    color: 'red',
    label: 'À revoir',
    icon: <ExclamationCircleOutlined />,
  },
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ statut, size = 'default' }) => {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG.EN_ATTENTE

  return (
    <Tag
      color={config.color}
      icon={config.icon}
      style={{
        fontSize: size === 'small' ? 11 : 13,
        padding: size === 'small' ? '0 6px' : '2px 8px',
        fontWeight: 600,
      }}
    >
      {config.label}
    </Tag>
  )
}

export default StatusBadge
