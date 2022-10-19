import './index.scss'
import React, { useEffect, useState } from 'react'
import Axios, {
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    AxiosInstance,
} from "axios";


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
import RoleTipPage from './tip'
import VideoPage from '../component/video'

import bg2 from '../../assets/img/bg2.png'
import avatar from '../../assets/img/avatar.png'
import people from '../../assets/img/people.png'
import rolebtn from '../../assets/img/rolebtn.png'

interface IntList {
    url: string
}
const RolePage: React.FC = () => {

    const { t } = useTranslation()
    const history = useHistory()
    const authState = useAuthState()
    const avatarId = authState.user?.avatarId?.value
    const avatarState = useHookstate(getState(AvatarState))
    const list = avatarState.avatarList.value
    const avatarList = list.slice(0, 6)

    const selfUser = useAuthState().user
    const userId = selfUser.id.value

    useEffect(() => {
        AvatarService.fetchAvatarList()
    }, [])

    const [selectedAvatar, setSelectedAvatar] = useState<any>('')
    const [peopleName, setpeopleName] = useState<string>('')
    const [tipText, settipText] = useState<string>('')
    const [showTip, setshowTip] = useState<boolean>(false)
    const [showSubTip, setshowSubTip] = useState<boolean>(true)
    const [showvideo, setshowvideo] = useState<boolean>(false)
    let defaultPeople = {
        name: ''
    };
    useEffect(() => {
        if (avatarList.length > 0) {
            defaultPeople = avatarList[0];
            setSelectedAvatar(defaultPeople)
            console.log('defaultPeople-----------------' + defaultPeople.name)
        }

    }, [avatarList[0]])

    // console.log('avatarList------------' + JSON.stringify(avatarList))

    const selectAvatar = (avatarResources: AvatarInterface) => {
        setSelectedAvatar(avatarResources)
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
        // setshowvideo(true)//接口通后删除
        if (!peopleName) {
            setshowTip(true);
            settipText('请输入名字')
            setTimeout(() => {
                setshowTip(false);
            }, 1000)
            return false
        }
        if (!selectedAvatar.id) {
            setshowTip(true);
            settipText('请选择角色')
            setTimeout(() => {
                setshowTip(false);
            }, 1000)
            return false
        }

        if (selectedAvatar.id && peopleName) {
            //保存用户名
            const name = peopleName.trim()
            AuthService.updateUsername(userId, name)
            //保存角色
            setAvatar(
                selectedAvatar?.id || '',
                selectedAvatar?.modelResource?.url || '',
                selectedAvatar?.thumbnailResource?.url || ''
            )
            setSelectedAvatar('')

            //业务接口
            Axios({
                url: 'https://xr.yee.link/bgy-api/user/edit',
                method: 'post',
                data: {
                    username: peopleName,
                    facade: selectedAvatar.id,
                    profile_picture: selectedAvatar.thumbnailResource.url
                },
                headers: { 'Content-Type': 'application/json' }
            }).then(res => {
                if (res.data.code == 200) {
                    //播放视频之后再跳转
                    setshowvideo(true)
                }
            }).catch(err => {
                let { message } = err;
                if (message == "Network Error") {
                    message = "后端接口连接异常";
                } else if (message.includes("timeout")) {
                    message = "系统接口请求超时";
                } else if (message.includes("Request failed with status code")) {
                    message = "系统接口" + message.substr(message.length - 3) + "异常";
                }
                setshowTip(true);
                settipText(message)
                setTimeout(() => {
                    setshowTip(false);
                }, 1000)

            })
        }

    }
    const changeSub = () => {
        setshowSubTip(false)
    }
    //页面跳转
    const gotoHome = () => {
        setshowvideo(false)
        history.push('location/default')
        // history.push('/location/bgy1')//测试用
    }
    return <div className="role-container" >
        {
            showSubTip ? (
                <RoleTipPage changeSub={changeSub} />
            ) : (<div></div>)
        }
        <div className='role-box'>
            <img className="bg2Style" src={bg2} alt="" style={{ height: '100%' }} />
            <div className='role-content'>
                <div className='left-box'>
                    <div className='people-box'>
                        <div className='people-bot-circle'></div>
                        <img className="peopleStyle" src={selectedAvatar.name} alt="" />
                    </div>
                    <div className='people-input-box'>
                        <input
                            className='people-input'
                            style={{ border: 'none', height: '100%', width: '100%', borderRadius: 'inherit', padding: '0 8px' }}
                            placeholder='请输入ta的名字'
                            onChange={(e) => {
                                peopleChange(e.target.value)
                            }}
                            onBlur={(e) => {
                                peopleBlur(e.target.value)
                            }}
                        />
                    </div>

                </div>
                <div className='right-box'>
                    <div className='list'>
                        <div className='list-box'>
                            {
                                avatarList.map((i, index) => {
                                    return <div key={index} className="item" onClick={() => selectAvatar(i)}>
                                        <img className="imgItem" src={i.thumbnailResource.url} alt="" />
                                    </div>
                                })
                            }

                        </div></div>
                    <img className="rolebtn" src={rolebtn} alt="" onClick={rolesubmit} />
                </div>
            </div>
        </div>
        {
            showvideo ? (<VideoPage videoclassName={'videoStyle'} gotoHome={gotoHome} />) : null
        }

        <CommonTip tipText={tipText} showTip={showTip} />
    </div>
}

export default RolePage
