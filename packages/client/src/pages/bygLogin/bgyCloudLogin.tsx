import React, { Fragment, useEffect, useState } from 'react'

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


export const BGYCloudLoginPage = (): any => {
  const [islogin, setIsLogin] = useState<boolean>(false);

  const avatarState = useHookstate(getState(AvatarState))
  const list = avatarState.avatarList.value
  const avatarList = list
  console.log('我是角色列表',avatarList)
  const authState = useAuthState()
  const selfUser = useAuthState().user
  const userId = selfUser.id.value
  const history = useHistory()
  const [selectTrue, setselectTrue] = useState(true)
  const [selectedAvatar, setSelectedAvatar] = useState<any>('')
  const [aPeople, setaPeople] = useState('')

  interface Props {
    changeActiveMenu: Function
  }

  const loginFn = (e) => {
    setIsLogin(e)
  }
  useEffect(() => {
    AvatarService.fetchAvatarList()
  }, [])

  // 获取页面路径的code参数
  const getUrlParam = (name) => { // 获取URL指定参数
    var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)') // 构造一个含有目标参数的正则表达式对象
    var r = window.location.search.substr(1).match(reg) // 匹配目标参数
    if (r != null) return unescape(r[2])
    console.log('我是获取的参数',r)
    //return null // 返回参数值
  }
  useEffect(async () => {
    if (avatarList.length > 0) {
        console.log('defaultPeople-----------------' + avatarList[0].name)
        selectAvatar(avatarList[0], 0)
        var API_LOGIN_ID = getUrlParam('API_LOGIN_ID')
        localStorage.setItem('API_LOGIN_ID',API_LOGIN_ID)
        var API_AVATARS_ID = getUrlParam('API_AVATARS_ID')
        localStorage.setItem('API_AVATARS_ID',API_AVATARS_ID)
        var AVATAR_THUMBNAIL = decodeURIComponent(getUrlParam('AVATAR_THUMBNAIL'))
        var AVATAR_NICKNAME = decodeURIComponent(getUrlParam('AVATAR_NICKNAME'))
        var AVATAR_MODELRESOURCE = decodeURIComponent(getUrlParam('AVATAR_MODELRESOURCE'))
        console.log('===============',AVATAR_MODELRESOURCE)

        setAvatar(API_AVATARS_ID,AVATAR_MODELRESOURCE,AVATAR_THUMBNAIL)
        var AVATAR_INDEX = getUrlParam('AVATAR_INDEX')
        localStorage.setItem('AVATAR_INDEX',AVATAR_INDEX)
        AuthService.updateUsername(userId, AVATAR_NICKNAME)
        var TOKEN = getUrlParam('TOKEN')
        localStorage.setItem('token',TOKEN)
        var GUIDEID = getUrlParam('GUIDEID')
        localStorage.setItem('guideId',GUIDEID)
        setTimeout(() => {
          history.replace('/location/BGYFW')
        }, 1000)
    }

}, [avatarList])

const selectAvatar = (avatarResources: AvatarInterface, index: Number) => {
  setaPeople(avatarResources.name)
  setSelectedAvatar(avatarResources)
  setselectTrue(false)
  // setSelectedAvatar(avatarResources.thumbnailResource.url)
}
 //头像保存
 const  setAvatar = async (avatarId: string, avatarURL: string, thumbnailURL: string) => {
  if (hasComponent(Engine.instance.currentWorld.localClientEntity, AvatarEffectComponent)) return
  if (userId)
      return AvatarService.updateUserAvatarId(userId, avatarId, avatarURL, thumbnailURL)
}
  return (
    <div className='cloudRenderPage-container' style={{ pointerEvents: 'auto',width:'100vw',height:'100vh' }}>
     云渲染登录中...
    </div>
  )
}

export default BGYCloudLoginPage