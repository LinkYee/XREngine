import './index.scss'
import React, { useEffect, useState } from 'react'
import { AvatarInterface } from '@xrengine/common/src/interfaces/AvatarInterface'
import { AudioEffectPlayer } from '@xrengine/engine/src/audio/systems/MediaSystem'
import { AvatarEffectComponent } from '@xrengine/engine/src/avatar/components/AvatarEffectComponent'
import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { hasComponent } from '@xrengine/engine/src/ecs/functions/ComponentFunctions'
import { getState, useHookstate } from '@xrengine/hyperflux'
import { ArrowBack, ArrowBackIos, ArrowForwardIos, Check, PersonAdd } from '@mui/icons-material'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import { useTranslation } from 'react-i18next'
import { useAuthState, AuthService } from '../../../../client-core/src/user/services/AuthService'
import { AvatarService, AvatarState } from '../../../../client-core/src/user/services/AvatarService'
import { Route, Switch, useHistory, useLocation } from 'react-router-dom'

import CommonTip from '../component/commenTip'

import rolebtn from '../../assets/img/rolebtn.png'
import { NotificationService } from "@xrengine/client-core/src/common/services/NotificationService";
import { getChannelTypeIdFromTransport } from '../../../../client-core/src/transports/SocketWebRTCClientFunctions';

interface RoleState {
    isCloud: boolean
}
const RolePage: React.FC<RoleState> = (props) => {
    const { isCloud } = props
    const { t } = useTranslation()
    const history = useHistory()
    const authState = useAuthState()
    const avatarId = authState.user?.avatarId?.value
    const avatarState = useHookstate(getState(AvatarState))
    const list = avatarState.avatarList.value


    var query = window.location.href.substring(1)
    var num = query.split("=")
    var invite = num[1]

    var avatarList = []
    avatarList = list
    //const avatarList = list
    // const defaultPeople = list[0].name
    const selfUser = useAuthState().user
    const userId = selfUser.id.value

    useEffect(() => {
        AvatarService.fetchAvatarList()
    }, [])

    // console.log('defaultPeople-----------------' + defaultPeople)

    const [aPeople, setaPeople] = useState('')
    const [selectTrue, setselectTrue] = useState(true)
    const [selectedAvatar, setSelectedAvatar] = useState<any>('')
    const [peopleName, setpeopleName] = useState<string>('')
    const [tipText, settipText] = useState<string>('')
    const [showTip, setshowTip] = useState<boolean>(false)
    useEffect(() => {
        if (avatarList.length > 0 && selectTrue) {
            console.log('defaultPeople-----------------' + avatarList[0].name)
            selectAvatar(avatarList[0], 0)
        }
    }, [avatarList])

    const selectAvatar = (avatarResources: AvatarInterface, index: Number) => {
        localStorage.setItem('AVATAR_INDEX', index + '')
        setaPeople(avatarResources.name)
        setSelectedAvatar(avatarResources)
        setselectTrue(false)
        // setSelectedAvatar(avatarResources.thumbnailResource.url)
    }
    //用户名验证
    const peopleBlur = (val: string) => {
        setpeopleName(val)
    }
    const peopleChange = (val: string) => {
        setpeopleName(val)
    }
    //头像保存
    const setAvatar = (avatarId: string, avatarURL: string, thumbnailURL: string) => {
        if (hasComponent(Engine.instance.currentWorld.localClientEntity, AvatarEffectComponent)) return
        if (authState.user?.value)
            AvatarService.updateUserAvatarId(authState.user.id.value!, avatarId, avatarURL, thumbnailURL)
    }
    //保存形象
    const rolesubmit = () => {
        if (!peopleName) {
            TipShow('请输入名字')
            return false
        }
        if (!selectedAvatar.id) {
            TipShow('请选择角色')
            return false
        }

        if (selectedAvatar.id && peopleName) {
            //保存用户名
            const name = peopleName.trim()
            localStorage.setItem('AVATAR_NICKNAME', name)
            AuthService.updateUsername(userId, name)
            //保存角色
            setAvatar(
                selectedAvatar?.id || '',
                selectedAvatar?.modelResource?.url || '',
                selectedAvatar?.thumbnailResource?.url || ''
            )
            localStorage.setItem('AVATAR_ID', selectedAvatar?.id || '')
            // console.log('')
            localStorage.setItem('AVATAR_MODELRESOURCE', selectedAvatar?.modelResource?.url || '')
            localStorage.setItem('AVATAR_THUMBNAIL', selectedAvatar?.thumbnailResource?.url || '')
            setSelectedAvatar('')
            gotoHome()
        }

    }
    //页面跳转
    const gotoHome = () => {
        NotificationService.dispatchNotify('即将带您进入元宇宙空间', { variant: 'info' })
        let targetLocation = localStorage.getItem("location")
        if(!targetLocation || targetLocation == ''){
            targetLocation = "/location/default"
            localStorage.removeItem("location")
        }else{
            targetLocation = decodeURIComponent(targetLocation)
        }
        history.push(targetLocation)
    }
    //tip
    const TipShow = (text: string) => {
        setshowTip(true);
        settipText(text)
        setTimeout(() => {
            setshowTip(false);
        }, 1500)
    }
    return <div className="role-container" >
        <div className='role-box'>
            <div className='role-content'>
                {/* <div className='left-box'>
                    <div className='people-box'>
                        <div className='people-bot-circle'></div>
                        <img className="peopleStyle" src={aPeople} alt="" />
                    </div>

                    <div className='people-input-box'>
                        <input
                            className='people-input'
                            style={{ border: 'none', height: '100%', width: '100%', borderRadius: 'inherit', padding: '0 8px' }}
                            placeholder='请输入ta1231的名字'
                            onChange={(e) => {
                                peopleChange(e.target.value)
                            }}
                            onBlur={(e) => {
                                peopleBlur(e.target.value)
                            }}
                        />
                    </div>

                </div> */}
                <div className='right-box'>
                    <div className='people-input-box'>
                        <input
                            className='people-input'
                            style={{ border: 'none', height: '100%', borderRadius: 'inherit', padding: '0 8px' }}
                            placeholder='请输入名字'
                            onChange={(e) => {
                                peopleChange(e.target.value)
                            }}
                            onBlur={(e) => {
                                peopleBlur(e.target.value)
                            }}
                        />
                    </div>
                    <div className='list'>
                        <div className='list-box'>
                            {
                                avatarList.map((i, index) => {
                                    return <div key={index} className="item" onClick={() => selectAvatar(i, index)}>
                                        <img className="imgItem" src={i.thumbnailResource.url} alt="" />
                                    </div>
                                })
                            }

                        </div>
                    </div>
                    <img className="rolebtn" style={{ width: '80%' }} src={rolebtn} alt="" onClick={rolesubmit} />
                </div>
            </div>
        </div>
        <CommonTip tipText={tipText} showTip={showTip} />
    </div>
}

export default RolePage
