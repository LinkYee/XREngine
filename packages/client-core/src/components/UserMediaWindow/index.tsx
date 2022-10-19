import { Downgraded, useHookstate } from '@hookstate/core'
import classNames from 'classnames'
import hark from 'hark'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { MediaStreamService, useMediaStreamState } from '@xrengine/client-core/src/media/services/MediaStreamService'
import { useLocationState } from '@xrengine/client-core/src/social/services/LocationService'
import { MediaStreams } from '@xrengine/client-core/src/transports/MediaStreams'
import {
  configureMediaTransports,
  createCamAudioProducer,
  createCamVideoProducer,
  globalMuteProducer,
  globalUnmuteProducer,
  pauseConsumer,
  pauseProducer,
  resumeConsumer,
  resumeProducer,
  stopScreenshare
} from '@xrengine/client-core/src/transports/SocketWebRTCClientFunctions'
import { getAvatarURLForUser } from '@xrengine/client-core/src/user/components/UserMenu/util'
import { useAuthState } from '@xrengine/client-core/src/user/services/AuthService'
import { useNetworkUserState } from '@xrengine/client-core/src/user/services/NetworkUserService'
import { AudioSettingAction, useAudioState } from '@xrengine/engine/src/audio/AudioState'
import { isMobile } from '@xrengine/engine/src/common/functions/isMobile'
import { Engine } from '@xrengine/engine/src/ecs/classes/Engine'
import { useEngineState } from '@xrengine/engine/src/ecs/classes/EngineState'
import { MessageTypes } from '@xrengine/engine/src/networking/enums/MessageTypes'
import { WorldState } from '@xrengine/engine/src/networking/interfaces/WorldState'
import { MediaSettingsState } from '@xrengine/engine/src/networking/MediaSettingsState'
import { applyScreenshareToTexture } from '@xrengine/engine/src/scene/functions/applyScreenshareToTexture'
import { dispatchAction, getState } from '@xrengine/hyperflux'

import {
  Launch,
  Mic,
  MicOff,
  RecordVoiceOver,
  Videocam,
  VideocamOff,
  VoiceOverOff,
  VolumeDown,
  VolumeMute,
  VolumeOff,
  VolumeUp
} from '@mui/icons-material'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Tooltip from '@mui/material/Tooltip'

import { useMediaInstanceConnectionState } from '../../common/services/MediaInstanceConnectionService'
import { SocketWebRTCClientNetwork } from '../../transports/SocketWebRTCClientNetwork'
import Draggable from './Draggable'
import styles from './index.module.scss'

interface Props {
  peerId?: string | 'cam_me' | 'screen_me'
}

export const useUserMediaWindowHook = ({ peerId }) => {
  const [isPiP, setPiP] = useState(false)
  const [videoStream, _setVideoStream] = useState<any>(null)
  const [audioStream, _setAudioStream] = useState<any>(null)
  const [videoStreamPaused, _setVideoStreamPaused] = useState(false)
  const [audioStreamPaused, _setAudioStreamPaused] = useState(false)
  const [videoProducerPaused, setVideoProducerPaused] = useState(true)
  const [audioProducerPaused, setAudioProducerPaused] = useState(true)
  const [videoProducerGlobalMute, setVideoProducerGlobalMute] = useState(false)
  const [audioProducerGlobalMute, setAudioProducerGlobalMute] = useState(false)
  const [audioTrackClones, setAudioTrackClones] = useState<any[]>([])
  const [videoTrackClones, setVideoTrackClones] = useState<any[]>([])
  const [videoTrackId, setVideoTrackId] = useState('')
  const [audioTrackId, setAudioTrackId] = useState('')
  const [harkListener, setHarkListener] = useState(null)
  const [soundIndicatorOn, setSoundIndicatorOn] = useState(false)
  const [videoDisplayReady, setVideoDisplayReady] = useState<boolean>(false)
  const userState = useNetworkUserState()
  const videoRef = useRef<any>()
  const audioRef = useRef<any>()
  const audioStreamPausedRef = useRef(audioStreamPaused)
  const videoStreamPausedRef = useRef(videoStreamPaused)
  const resumeVideoOnUnhide = useRef<boolean>(false)
  const resumeAudioOnUnhide = useRef<boolean>(false)
  const selfVideoPausedRef = useRef<boolean>(false)
  const selfAudioPausedRef = useRef<boolean>(false)
  const videoStreamRef = useRef(videoStream)
  const audioStreamRef = useRef(audioStream)
  const mediastream = useMediaStreamState()
  const { t } = useTranslation()
  const audioState = useAudioState()

  const [_volume, _setVolume] = useState(1)

  const userHasInteracted = useEngineState().userHasInteracted
  const selfUser = useAuthState().user.value
  const currentLocation = useLocationState().currentLocation.location
  const enableGlobalMute =
    currentLocation?.locationSetting?.locationType?.value === 'showroom' &&
    selfUser?.locationAdmins?.find((locationAdmin) => currentLocation?.id?.value === locationAdmin.locationId) != null
  const isSelf = peerId === 'cam_me' || peerId === 'screen_me'
  const volume = isSelf ? audioState.microphoneGain.value : _volume
  const isScreen = Boolean(peerId && peerId.startsWith('screen_'))
  const userId = isScreen ? peerId!.replace('screen_', '') : peerId
  const user = userState.layerUsers.find((user) => user.id.value === userId)?.attach(Downgraded).value

  const isCamVideoEnabled = isScreen ? mediastream.isScreenVideoEnabled : mediastream.isCamVideoEnabled
  const isCamAudioEnabled = isScreen ? mediastream.isScreenAudioEnabled : mediastream.isCamAudioEnabled
  const consumers = mediastream.consumers

  const channelConnectionState = useMediaInstanceConnectionState()
  const mediaHostID = Engine.instance.currentWorld.mediaNetwork?.hostId
  const currentChannelInstanceConnection = mediaHostID && channelConnectionState.instances[mediaHostID].ornull

  const mediaSettingState = useHookstate(getState(MediaSettingsState))
  const sceneMetadata = Engine.instance.currentWorld.sceneMetadata.mediaSettings
  const rendered =
    mediaSettingState.immersiveMediaMode.value === 'off' ||
    (mediaSettingState.immersiveMediaMode.value === 'auto' && !sceneMetadata.immersiveMedia.value)

  const setVideoStream = (value) => {
    if (value?.track) setVideoTrackId(value.track.id)
    videoStreamRef.current = value
    _setVideoStream(value)
  }

  const setAudioStream = (value) => {
    if (value?.track) setAudioTrackId(value.track.id)
    audioStreamRef.current = value
    _setAudioStream(value)
  }

  const setVideoStreamPaused = (value) => {
    videoStreamPausedRef.current = value
    _setVideoStreamPaused(value)
  }

  const setAudioStreamPaused = (value) => {
    audioStreamPausedRef.current = value
    _setAudioStreamPaused(value)
  }

  const pauseConsumerListener = (consumerId: string) => {
    if (consumerId === videoStreamRef?.current?.id) setVideoStreamPaused(true)
    else if (consumerId === audioStreamRef?.current?.id) setAudioStreamPaused(true)
  }

  const resumeConsumerListener = (consumerId: string) => {
    if (consumerId === videoStreamRef?.current?.id && !selfVideoPausedRef.current) setVideoStreamPaused(false)
    else if (consumerId === audioStreamRef?.current?.id && !selfAudioPausedRef.current) setAudioStreamPaused(false)
  }

  const pauseProducerListener = (producerId: string, globalMute: boolean) => {
    if (producerId === videoStreamRef?.current?.id && globalMute) {
      setVideoProducerPaused(true)
      setVideoProducerGlobalMute(true)
    } else if (producerId === audioStreamRef?.current?.id && globalMute) {
      setAudioProducerPaused(true)
      setAudioProducerGlobalMute(true)
    } else {
      const network = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
      const videoConsumer = network.consumers?.find(
        (c) =>
          c.appData.peerId === userId &&
          c.producerId === producerId &&
          c.appData.mediaTag === (isScreen ? 'screen-video' : 'cam-video')
      )
      const audioConsumer = network.consumers?.find(
        (c) =>
          c.appData.peerId === userId &&
          c.producerId === producerId &&
          c.appData.mediaTag === (isScreen ? 'screen-audio' : 'cam-audio')
      )
      if (videoConsumer) {
        ;(videoConsumer as any).producerPaused = true
        setVideoProducerPaused(true)
      }
      if (audioConsumer) {
        ;(audioConsumer as any).producerPaused = true
        setAudioProducerPaused(true)
      }
    }
  }

  const resumeProducerListener = (producerId: string) => {
    if (producerId === videoStreamRef?.current?.id) {
      setVideoProducerPaused(false)
      setVideoProducerGlobalMute(false)
    } else if (producerId === audioStreamRef?.current?.id) {
      setAudioProducerPaused(false)
      setAudioProducerGlobalMute(false)
    } else {
      const network = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
      const videoConsumer = network.consumers?.find(
        (c) => c.appData.peerId === userId && c.appData.mediaTag === (isScreen ? 'screen-video' : 'cam-video')
      )
      const audioConsumer = network.consumers?.find(
        (c) => c.appData.peerId === userId && c.appData.mediaTag === (isScreen ? 'screen-audio' : 'cam-audio')
      )
      if (videoConsumer) {
        ;(videoConsumer as any).producerPaused = false
        setVideoProducerPaused(false)
      }
      if (audioConsumer) {
        ;(audioConsumer as any).producerPaused = false
        setAudioProducerPaused(false)
      }
    }
  }

  const closeProducerListener = (producerId: string) => {
    if (producerId === videoStreamRef?.current?.id) {
      videoRef.current?.srcObject?.getVideoTracks()[0].stop()
      if (!isScreen) MediaStreams.instance.videoStream.getVideoTracks()[0].stop()
      else MediaStreams.instance.localScreen.getVideoTracks()[0].stop
    }

    if (producerId === audioStreamRef?.current?.id) {
      audioRef.current?.srcObject?.getAudioTracks()[0].stop()
      if (!isScreen) MediaStreams.instance.audioStream.getAudioTracks()[0].stop()
    }
  }

  useEffect(() => {
    if (peerId === 'cam_me') {
      setVideoStream(MediaStreams.instance.camVideoProducer)
      setVideoStreamPaused(MediaStreams.instance.videoPaused)
    } else if (peerId === 'screen_me') setVideoStream(MediaStreams.instance.screenVideoProducer)
  }, [isCamVideoEnabled.value])

  useEffect(() => {
    if (peerId === 'cam_me') {
      setAudioStream(MediaStreams.instance.camAudioProducer)
      setAudioStreamPaused(MediaStreams.instance.audioPaused)
    } else if (peerId === 'screen_me') setAudioStream(MediaStreams.instance.screenAudioProducer)
  }, [isCamAudioEnabled.value])

  useEffect(() => {
    if (peerId !== 'cam_me' && peerId !== 'screen_me') {
      const network = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
      if (network) {
        const videoConsumer = network.consumers?.find(
          (c) => c.appData.peerId === userId && c.appData.mediaTag === (isScreen ? 'screen-video' : 'cam-video')
        )
        const audioConsumer = network.consumers?.find(
          (c) => c.appData.peerId === userId && c.appData.mediaTag === (isScreen ? 'screen-audio' : 'cam-audio')
        )
        if (videoConsumer) {
          setVideoProducerPaused((videoConsumer as any).producerPaused)
          setVideoStreamPaused(videoConsumer.paused)
        }
        if (audioConsumer) {
          setAudioProducerPaused((audioConsumer as any).producerPaused)
          setAudioStreamPaused(audioConsumer.paused)
        }
        setVideoStream(videoConsumer)
        setAudioStream(audioConsumer)
      }
    }
  }, [consumers.value])

  useEffect(() => {
    if (userHasInteracted.value && peerId !== 'cam_me' && peerId !== 'screen_me') {
      videoRef.current?.play()
      audioRef.current?.play()
      if (harkListener) (harkListener as any).resume()
    }
  }, [userHasInteracted.value])

  useEffect(() => {
    if (!currentChannelInstanceConnection) return
    const mediaNetwork = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
    const socket = mediaNetwork.socket
    if (typeof socket?.on === 'function') socket?.on(MessageTypes.WebRTCPauseConsumer.toString(), pauseConsumerListener)
    if (typeof socket?.on === 'function')
      socket?.on(MessageTypes.WebRTCResumeConsumer.toString(), resumeConsumerListener)
    if (typeof socket?.on === 'function') socket?.on(MessageTypes.WebRTCPauseProducer.toString(), pauseProducerListener)
    if (typeof socket?.on === 'function')
      socket?.on(MessageTypes.WebRTCResumeProducer.toString(), resumeProducerListener)
    if (typeof socket?.on === 'function') socket?.on(MessageTypes.WebRTCCloseProducer.toString(), closeProducerListener)

    return () => {
      if (typeof socket?.on === 'function')
        socket?.off(MessageTypes.WebRTCPauseConsumer.toString(), pauseConsumerListener)
      if (typeof socket?.on === 'function')
        socket?.off(MessageTypes.WebRTCResumeConsumer.toString(), resumeConsumerListener)
      if (typeof socket?.on === 'function')
        socket?.off(MessageTypes.WebRTCPauseProducer.toString(), pauseProducerListener)
      if (typeof socket?.on === 'function')
        socket?.off(MessageTypes.WebRTCResumeProducer.toString(), resumeProducerListener)
      if (typeof socket?.on === 'function')
        socket?.off(MessageTypes.WebRTCCloseProducer.toString(), closeProducerListener)
    }
  }, [currentChannelInstanceConnection])

  useEffect(() => {
    if (audioRef.current != null) {
      audioRef.current.id = `${peerId}_audio`
      audioRef.current.autoplay = true
      audioRef.current.setAttribute('playsinline', 'true')
      if (peerId === 'cam_me' || peerId === 'screen_me') {
        audioRef.current.muted = true
      } else {
        audioRef.current.volume = volume
      }
      if (audioStream != null) {
        const newAudioTrack = audioStream.track.clone()
        const updateAudioTrackClones = audioTrackClones.concat(newAudioTrack)
        setAudioTrackClones(updateAudioTrackClones)
        audioRef.current.srcObject = new MediaStream([newAudioTrack])
        const newHark = hark(audioRef.current.srcObject, { play: false })
        newHark.on('speaking', () => {
          setSoundIndicatorOn(true)
        })
        newHark.on('stopped_speaking', () => {
          setSoundIndicatorOn(false)
        })
        setHarkListener(newHark)
        setAudioProducerPaused(audioStream.paused)
      }
    }

    return () => {
      audioTrackClones.forEach((track) => track.stop())
      if (harkListener) (harkListener as any).stop()
    }
  }, [audioTrackId])

  useEffect(() => {
    if (videoRef.current != null) {
      videoRef.current.id = `${peerId}_video`
      videoRef.current.autoplay = true
      videoRef.current.muted = true
      videoRef.current.setAttribute('playsinline', 'true')
      if (videoStream != null) {
        setVideoDisplayReady(false)
        if (peerId === 'cam_me' || peerId === 'screen_me') setVideoProducerPaused(false)
        const originalTrackEnabledInterval = setInterval(() => {
          if (videoStream.track.enabled) {
            clearInterval(originalTrackEnabledInterval)

            // if (!videoRef.current?.srcObject?.active || !videoRef.current?.srcObject?.getVideoTracks()[0].enabled) {
            const newVideoTrack = videoStream.track.clone()
            videoTrackClones.forEach((track) => track.stop())
            setVideoTrackClones([newVideoTrack])
            videoRef.current.srcObject = new MediaStream([newVideoTrack])
            if (isScreen) {
              applyScreenshareToTexture(videoRef.current)
            }
            setVideoDisplayReady(true)
            // }
          }
        }, 100)
      }
    }

    return () => {
      videoTrackClones.forEach((track) => track.stop())
    }
  }, [videoTrackId])

  useEffect(() => {
    if (peerId === 'cam_me' || peerId === 'screen_me') {
      setAudioStreamPaused(MediaStreams.instance.audioPaused)
    }
  }, [MediaStreams.instance.audioPaused])

  useEffect(() => {
    if (peerId === 'cam_me' || peerId === 'screen_me') {
      setVideoStreamPaused(MediaStreams.instance.videoPaused)
      if (videoRef.current != null) {
        if (MediaStreams.instance.videoPaused) {
          videoRef.current?.srcObject?.getVideoTracks()[0].stop()
          MediaStreams.instance.videoStream.getVideoTracks()[0].stop()
        }
      }
    }
  }, [MediaStreams.instance.videoPaused])

  useEffect(() => {
    if (
      !(peerId === 'cam_me' || peerId === 'screen_me') &&
      !videoProducerPaused &&
      videoStream != null &&
      videoRef.current != null
    ) {
      const originalTrackEnabledInterval = setInterval(() => {
        if (videoStream.track.enabled) {
          clearInterval(originalTrackEnabledInterval)

          if (!videoRef.current?.srcObject?.getVideoTracks()[0].enabled) {
            const newVideoTrack = videoStream.track.clone()
            videoTrackClones.forEach((track) => track.stop())
            setVideoTrackClones([newVideoTrack])
            videoRef.current.srcObject = new MediaStream([newVideoTrack])
          }
        }
      }, 100)
    }
  }, [videoProducerPaused])

  useEffect(() => {
    if (
      !(peerId === 'cam_me' || peerId === 'screen_me') &&
      !audioProducerPaused &&
      audioStream != null &&
      audioRef.current != null
    ) {
      const originalTrackEnabledInterval = setInterval(() => {
        if (audioStream.track.enabled) {
          clearInterval(originalTrackEnabledInterval)

          if (!audioRef.current?.srcObject?.getAudioTracks()[0].enabled) {
            const newAudioTrack = audioStream.track.clone()
            const updateAudioTrackClones = audioTrackClones.concat(newAudioTrack)
            setAudioTrackClones(updateAudioTrackClones)
            audioRef.current.srcObject = new MediaStream([newAudioTrack])
          }
        }
      })
    }
  }, [audioProducerPaused])

  useEffect(() => {
    MediaStreams.instance.microphoneGainNode?.gain.setTargetAtTime(
      audioState.microphoneGain.value,
      Engine.instance.audioContext.currentTime,
      0.01
    )
  }, [audioState.microphoneGain])

  const toggleVideo = async (e) => {
    e.stopPropagation()
    const mediaNetwork = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
    if (peerId === 'cam_me') {
      if (await configureMediaTransports(mediaNetwork, ['video'])) {
        if (MediaStreams.instance.camVideoProducer == null) await createCamVideoProducer(mediaNetwork)
        else {
          const videoPaused = MediaStreams.instance.toggleVideoPaused()
          if (videoPaused) await pauseProducer(mediaNetwork, MediaStreams.instance.camVideoProducer)
          else await resumeProducer(mediaNetwork, MediaStreams.instance.camVideoProducer)
        }
        MediaStreamService.updateCamVideoState()
      }
    } else if (peerId === 'screen_me') {
      const videoPaused = MediaStreams.instance.toggleScreenShareVideoPaused()
      if (videoPaused) await stopScreenshare(mediaNetwork)
      // else await resumeProducer(mediaNetwork, MediaStreams.instance.screenVideoProducer)
      setVideoStreamPaused(videoPaused)
      MediaStreamService.updateScreenAudioState()
      MediaStreamService.updateScreenVideoState()
    } else {
      if (!videoStreamPausedRef.current) {
        selfVideoPausedRef.current = true
        await pauseConsumer(mediaNetwork, videoStream)
        setVideoStreamPaused(true)
      } else {
        selfVideoPausedRef.current = false
        await resumeConsumer(mediaNetwork, videoStream)
        setVideoStreamPaused(false)
      }
    }
  }

  const toggleAudio = async (e) => {
    e.stopPropagation()
    const mediaNetwork = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
    if (peerId === 'cam_me') {
      if (await configureMediaTransports(mediaNetwork, ['audio'])) {
        if (MediaStreams.instance.camAudioProducer == null) await createCamAudioProducer(mediaNetwork)
        else {
          const audioPaused = MediaStreams.instance.toggleAudioPaused()
          if (audioPaused) await pauseProducer(mediaNetwork, MediaStreams.instance.camAudioProducer)
          else await resumeProducer(mediaNetwork, MediaStreams.instance.camAudioProducer)
        }
        MediaStreamService.updateCamAudioState()
      }
    } else if (peerId === 'screen_me') {
      const audioPaused = MediaStreams.instance.toggleScreenShareAudioPaused()
      if (audioPaused) await pauseProducer(mediaNetwork, MediaStreams.instance.screenAudioProducer)
      else await resumeProducer(mediaNetwork, MediaStreams.instance.screenAudioProducer)
      setAudioStreamPaused(audioPaused)
    } else {
      if (!audioStreamPausedRef.current) {
        selfAudioPausedRef.current = true
        await pauseConsumer(mediaNetwork, audioStream)
        setAudioStreamPaused(true)
      } else {
        selfAudioPausedRef.current = false
        await resumeConsumer(mediaNetwork, audioStream)
        setAudioStreamPaused(false)
      }
    }
  }

  const toggleGlobalMute = async (e) => {
    e.stopPropagation()
    const mediaNetwork = Engine.instance.currentWorld.mediaNetwork as SocketWebRTCClientNetwork
    if (!audioProducerGlobalMute) {
      await globalMuteProducer(mediaNetwork, { id: audioStream.producerId })
      setAudioProducerGlobalMute(true)
    } else if (audioProducerGlobalMute) {
      await globalUnmuteProducer(mediaNetwork, { id: audioStream.producerId })
      setAudioProducerGlobalMute(false)
    }
  }

  const adjustVolume = (e, value) => {
    if (isSelf) {
      dispatchAction(AudioSettingAction.setMicrophoneVolume({ value }))
    } else {
      audioRef.current.volume = value
    }
    _setVolume(value)
  }

  const getUsername = () => {
    if (peerId === 'cam_me') return t('user:person.you')
    if (peerId === 'screen_me') return t('user:person.yourScreen')
    if (peerId?.startsWith('screen_')) return user?.name + "'s Screen"
    return user?.name
  }

  const togglePiP = () => setPiP(!isPiP)

  const isSelfUser = peerId === 'cam_me' || peerId === 'screen_me'
  const username = getUsername()

  const userAvatarDetails = useHookstate(getState(WorldState).userAvatarDetails)

  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (videoStreamRef.current != null && !videoStreamRef.current.paused && !videoStreamPausedRef.current) {
        resumeVideoOnUnhide.current = true
        toggleVideo({
          stopPropagation: () => {}
        })
      }
      if (audioStreamRef.current != null && !audioStreamRef.current.paused && !audioStreamPausedRef.current) {
        resumeAudioOnUnhide.current = true
        toggleAudio({
          stopPropagation: () => {}
        })
      }
    }
    if (!document.hidden) {
      if (videoStreamRef.current != null && resumeVideoOnUnhide.current)
        toggleVideo({
          stopPropagation: () => {}
        })
      if (audioStreamRef.current != null && resumeAudioOnUnhide.current)
        toggleAudio({
          stopPropagation: () => {}
        })
      resumeVideoOnUnhide.current = false
      resumeAudioOnUnhide.current = false
    }
  }

  useEffect(() => {
    if (isMobile) {
      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [])

  return {
    user,
    isPiP,
    volume,
    isScreen,
    username,
    selfUser,
    audioRef,
    videoRef,
    isSelfUser,
    videoStream,
    audioStream,
    enableGlobalMute,
    userAvatarDetails,
    videoStreamPaused,
    audioStreamPaused,
    videoProducerPaused,
    audioProducerPaused,
    videoProducerGlobalMute,
    audioProducerGlobalMute,
    videoDisplayReady,
    soundIndicatorOn,
    t,
    togglePiP,
    toggleAudio,
    toggleVideo,
    adjustVolume,
    toggleGlobalMute,
    rendered
  }
}

const UserMediaWindow = ({ peerId }: Props): JSX.Element => {
  const {
    user,
    isPiP,
    volume,
    isScreen,
    username,
    selfUser,
    audioRef,
    videoRef,
    isSelfUser,
    videoStream,
    audioStream,
    enableGlobalMute,
    userAvatarDetails,
    videoStreamPaused,
    audioStreamPaused,
    videoProducerPaused,
    audioProducerPaused,
    videoProducerGlobalMute,
    audioProducerGlobalMute,
    videoDisplayReady,
    soundIndicatorOn,
    t,
    togglePiP,
    toggleAudio,
    toggleVideo,
    adjustVolume,
    toggleGlobalMute,
    rendered
  } = useUserMediaWindowHook({ peerId })

  const prizeOpen = ()=>{
    console.log('我点击了')
    const ctlBox = document.getElementById('ctrlBox')
    const userMenuBox = document.getElementById('userMenuBox')
    ctlBox.style.display = 'none'
    userMenuBox.style.display = 'none'
    document.getElementById('prizeContainer').style.display = 'flex'
    document.getElementById('prizeContainer').style.zIndex = '9999'
  }

  return (
    <Draggable isPiP={isPiP}>
      <div
        tabIndex={0}
        id={peerId + '_container'}
        className={classNames({
          [styles['resizeable-screen']]: isScreen && !isPiP,
          [styles['resizeable-screen-fullscreen']]: isScreen && isPiP,
          [styles['party-chat-user']]: true,
          [styles['self-user']]: peerId === 'cam_me',
          [styles['no-video']]: videoStream == null,
          [styles['video-paused']]: (videoStream && (videoProducerPaused || videoStreamPaused)) || !videoDisplayReady,
          [styles.pip]: isPiP && !isScreen,
          [styles.screenpip]: isPiP && isScreen
        })}
        style={{
          pointerEvents: 'auto',
          display: isSelfUser || rendered ? 'auto' : 'none'
        }}
        onClick={() => {
          if (isScreen && isPiP) togglePiP()
        }}
      >
        <div
          className={classNames({
            [styles['video-wrapper']]: !isScreen,
            [styles['screen-video-wrapper']]: isScreen,
            [styles['border-lit']]: soundIndicatorOn
          })}
        >
          {(videoStream == null ||
            videoStreamPaused ||
            videoProducerPaused ||
            videoProducerGlobalMute ||
            !videoDisplayReady) && (
            <img
              src={getAvatarURLForUser(userAvatarDetails, isSelfUser ? selfUser?.id : user?.id)}
              alt=""
              crossOrigin="anonymous"
              draggable={false}
            />
          )}
          <video key={peerId + '_cam'} ref={videoRef} draggable={false} />
        </div>
        <audio key={peerId + '_audio'} ref={audioRef} />
        <div className={styles['user-controls']}>
          {/* 用户名 */}
          <div className={styles['username']}>{username}</div>
          {/* 按钮 */}
          <div className={styles['controls']}>
            {/* <div className={styles['box']} onClick={()=>{prizeOpen()}}>我的奖品</div> */}
          </div>
        </div>
      </div>
    </Draggable>
  )
}

export default UserMediaWindow
