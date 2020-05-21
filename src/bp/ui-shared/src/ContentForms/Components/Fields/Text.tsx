import React, { FC } from 'react'

import style from '../style.scss'
import { FieldProps } from '../typings'

interface TextPorps extends FieldProps {
  type: string
}

const Text: FC<TextPorps> = ({ onChange, placeholder, type, value }) => (
  <input
    className={style.input}
    type={type}
    placeholder={placeholder}
    onChange={e => onChange?.(e.target.value)}
    value={value}
  />
)

export default Text