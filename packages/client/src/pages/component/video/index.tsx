import React, { useEffect, useState } from 'react'
import videoAVI from './rolepass.mp4'

export interface VideoBarProps {
    videoclassName?: string;
    videostyle?: React.CSSProperties;
    gotoHome: Function
}

const VideoPage: React.FC<VideoBarProps> = (props) => {
    let video: HTMLElement | null = document.getElementById('myVideo');

        video?.addEventListener('ended', () => {
            console.log('视频结束')
            props.gotoHome()
        })
    return <div className='video-container' style={{ position:'absolute', zIndex: 9999,width:'100vw',height:'100vh' }}>
        <video id="myVideo" webkit-playsInline="true" x-webkit-airplay="true" playsInline="true" x5-video-player-fullscreen="true" width="100%" height="100%" preload="auto" autoPlay controls="controls" x5-video-player-type="h5-page">
            <source src={'https://xr-resources.yee.link/BGYvideo/transition%20Animation.mp4'} type="video/mp4" />
        </video>
    </div>
}
export default VideoPage
