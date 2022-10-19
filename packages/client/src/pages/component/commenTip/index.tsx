import './index.scss'
import React, { useEffect, useState } from 'react'

interface IniProps {
    tipText: string
    showTip: boolean
}
const CommonTip: React.FC<IniProps> = (props) => {
    return (
        <div className='tip-container' style={{ display: props.showTip ? 'block' : 'none', zIndex: 9999 }}>
            <div style={{ color: 'red' }}>{props.tipText}</div>
        </div>
    );
};

export default CommonTip;