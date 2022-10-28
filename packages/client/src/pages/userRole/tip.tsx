import './index.scss'
import React, { useEffect, useState } from 'react'
import axios from 'axios'

import bg4 from '../../assets/img/bg4.png'

interface IntList {
    url: string
}
interface IntProps {
    changeSub: Function
}
const RoleTipPage: React.FC<IntProps> = (props) => {

    useEffect(() => {

    }, [])
    const submit = () => {
        props.changeSub()
    }
    return <div className="role-tip-container" >
        <div className="role-tip-content">
            <img className="bg4Style" src={bg4} alt="" style={{ height: '100%' }} />
            <div className='role-tip-box'>
                <div className='role-tip-title'>
                    提示
                </div>
                <div className='role-tip-text'>
                    欢迎进入碧桂园服务第二届客户体验创新节活动，快来选择您的虚拟人形象吧！
                </div>
                <div className='role-submit-btn' onClick={submit}>确定</div>
            </div>
        </div>
    </div>
}

export default RoleTipPage
