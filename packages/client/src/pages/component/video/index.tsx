import React from 'react'
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
    const playVideo = () => { }
    return <div className={props.videoclassName} style={props.videostyle} >
        <video id="myVideo"  src={videoAVI} autoPlay onClick={playVideo} style={{ width: '100%', height: '100%', objectFit: 'fill', zIndex: 1 }} />
        {/* <video id="myVideo"  src={'https://www.w3school.com.cn/i/movie.mp4'} autoPlay onClick={playVideo} style={{ width: '100%', height: '100%', objectFit: 'fill', zIndex: 1 }} >
        </video> */}
    </div>
}
export default VideoPage
