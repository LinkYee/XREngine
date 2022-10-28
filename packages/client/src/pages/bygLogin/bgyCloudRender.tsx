import React, { Fragment, useEffect, useState,useRef } from 'react'
import {
	LarkSR
} from "larksr_websdk";
import "./bgyCloudRender.css";
import domtoimage from 'dom-to-image';
import QRCode  from 'qrcode.react';
import { GamepadAxis, GamepadButtons } from '@xrengine/engine/src/input/enums/InputEnums'
import { getAvatarURLForUser } from '../../../../client-core/src/user/components/UserMenu/util'
import { AuthService, useAuthState } from '../../../../client-core/src/user/services/AuthService'
import { getState } from '@xrengine/hyperflux'
import { createState, useHookstate } from '@hookstate/core'
import { WorldState } from '@xrengine/engine/src/networking/interfaces/WorldState'

export const BGYCloudRenderPage = (): any => {
  const userAvatarDetails = useHookstate(getState(WorldState).userAvatarDetails)
  const selfUser = useAuthState().user
  const userId = selfUser.id.value
  const username = selfUser.name.value
  console.log('------------------------')
  console.log(selfUser)
  // console.log()
  // console.log()
  const [larksr, setLarksr] = useState<any>(null);
	const [showPoster, setShowPoster] = useState<boolean>(false);
	const [posterHeight, setPosterHeight] = useState<any>(0);
	const [qrCodeWidth, setQrCodeWidth] = useState<any>(0);
	const [posterImg,setPosterImg] = useState<any>('https://xr-resources.yee.link/BGYimg/prohb3.jpg')
	const myRef = useRef()
  let qrCodeUrl;
	// localStorage.setItem("invite", 8);

  const inviteId = localStorage.getItem('API_LOGIN_ID')
  const avatarId = localStorage.getItem('AVATAR_ID')
  const avatarThumbnail = localStorage.getItem('AVATAR_THUMBNAIL')
  const avatarNickName = localStorage.getItem('AVATAR_NICKNAME')
  const avatarSource = localStorage.getItem('AVATAR_MODELRESOURCE')
  const avatarIndex = localStorage.getItem('AVATAR_INDEX')
	if(inviteId){
		qrCodeUrl = `${window.location.origin}/guide/#/guide?invite=${inviteId}`
	}

  useEffect(() => {
		const larksr = new LarkSR({
			rootElement: myRef.current,
		
		});

		// 初始化您的授权ID
		larksr.initSDKAuthCode("4528ee6248e04393bb4dba69f0731db1")
			.then(() => {
				// start connect;
				larksr.connectWithPxyHost({
						// people beijig 879414254636105728
						appliId: "1026085181720625152",
            "extraParam.app":  `https://xr-bgy-prd.yee.link/bgyCloudLogin?API_LOGIN_ID=${inviteId}&AVATAR_ID=${avatarId}&AVATAR_THUMBNAIL=${avatarThumbnail}&AVATAR_NICKNAME=${avatarNickName}&AVATAR_MODELRESOURCE=${avatarSource}$AVATAR_INDEX=${avatarIndex}`
					})
					.then(() => {
						console.log('enter success');
					})
					.catch((e) => {
						console.error(e);
						alert(JSON.stringify(e));
					});
			})
			.catch((e) => {
				console.error(e);
				alert(JSON.stringify(e));
			});


		// 监听连接成功事件
		larksr.on('connect', (e) => {
			console.log("LarkSRClientEvent CONNECT", e);
		});
		larksr.on('gotremotesteam', (e) => {
			console.log("LarkSRClientEvent gotremotesteam", e);
		});
		larksr.on('meidaloaded', (e) => {
			console.log("LarkSRClientEvent meidaloaded", e);
		});
		larksr.on('mediaplaysuccess', (e) => {
			console.log("LarkSRClientEvent mediaplaysuccess", e);
		});
		larksr.on('mediaplayfailed', (e) => {
			console.log("LarkSRClientEvent mediaplayfailed", e);
		});
		larksr.on('meidaplaymute', (e) => {
			console.log("LarkSRClientEvent meidaplaymute", e);
		});
		console.log("load appli success", larksr);
		larksr.on('error', (e) => {
			console.error("LarkSRClientEvent error", e);
			alert(JSON.stringify(e.message));
		});
		larksr.on('info', (e) => {
			console.log("LarkSRClientEvent info", e);
		});

		setLarksr(larksr)

		// console.log('ref', myRef.current);
	}, []);
	
	useEffect(() => {
    const cWidth = document.documentElement.clientWidth;
    const cHeight = document.documentElement.clientHeight;
    const { width, height } = myRef.current.getBoundingClientRect()
    let bl;
    if (cWidth < cHeight){
      bl = width
      // const contentDOM = document.getElementById("default");
      // contentDOM.style.width = height + 'px';
      // contentDOM.style.height = width + 'px';
      // contentDOM.style.top = (height - width) / 2 + 'px';
      // contentDOM.style.left = 0 - (height - width) / 2 + 'px';
      // contentDOM.style.transform = 'rotate(90deg)';
    }else{
      bl = height
    }
		// 获取平行云自动设置的宽高
		setPosterHeight(bl * 0.8)
		setQrCodeWidth(bl/13)
		// alert(width)

    // 设置default样式
    setTimeout(() => {
      console.log('------------------------------------')
      
      document.getElementById("default").style.top = 0
      // document.getElementById("default").style.width = height + 'px'
      // document.getElementById("default").style.height = width + 'px'
      // document.getElementById("default").style.transform = 'rotate(' + 90 + 'deg)'
    },1000)
    
	},[])

  const Poster = () => {
		
		const [isWx, setIsWx] = useState(false);
		const [imgLoad, setImgLoad] = useState(false);
		
		const posterSuccess = (e) => {
			console.log(e);
		}
		
		useEffect(() => {
			// 判断浏览器
			const ua = window.navigator.userAgent.toLowerCase()
			let isWeixin = ua.indexOf('micromessenger') != -1;
			if (isWeixin) {
				setIsWx(true)
			}else{
				console.log('普通浏览器')
			}
		},[])
		
		
		const onImageLoad = (e) => {
			console.log('加载完成')
			setImgLoad(true)
		}
		
		const close = () => {
			setShowPoster(false)
		}
		
		// 下载图片
		const downImg = async ()=>{
			const node = document.getElementById('poster');
			const el = document.getElementById('poster-img');
			// @ts-ignore
			const { width, height } = el.getBoundingClientRect();
			const defaultUrl = await domtoimage.toPng(node,{
                quantity: 1,
                width: 1440,
                height: 2558,
                style: {
                    transform: `scaleX(${1440/width}) scaleY(${2558/height})`,
                    transformOrigin: '0 0',
                }
            });
			const img = new Image();
			img.src = defaultUrl;
			img.setAttribute('className', 'pngImg');
			img.style.display = 'none';
			document.body.appendChild(img);
			const link = document.createElement('a');
			link.download = `${new Date().getTime()}_post`;
			link.href = defaultUrl;
			link.click();
		}
		
		return (
			<div className="poster-box">
				{
					imgLoad && <div className="close-box" onClick={() => close()}>
					<img className="close-img" src="https://xr-resources.yee.link/BGYimg/poster-close.png" alt=""/>
				</div>
				}
				<div className="poster-main" id="poster" style={{height: posterHeight + 'px'}} >
					<img className="poster-img" id="poster-img" src={posterImg} onLoad={() => onImageLoad()}  alt=""/>
					{
						imgLoad && <div className="qr-code" style={{bottom: posterHeight/43 + 'px',right:posterHeight/33 + 'px'}}>
							<QRCode value={qrCodeUrl} size={qrCodeWidth} fgColor="#000000" />
						</div>
					}
				</div>
				{
					imgLoad && <div>
						{
							isWx?(
								<div className="down tip" style={{height: posterHeight/15 + 'px',lineHeight: posterHeight/15 + 'px'}}>
									长按上面图片保存或分享
								</div>
							):(
								<div className="down" onClick={() => downImg()} style={{height: posterHeight/15 + 'px',lineHeight: posterHeight/15 + 'px'}}>
								 	下载到本地{imgLoad}
								</div>
							)
						}
					</div>
				}
				
				
				
			</div>
		)
	}
	// 打开海报
	const openPoster = () => {
		setShowPoster(true)
	}

  const openMyAward = () => {
    console.log(document.getElementById("prizeContainer"))
    document.getElementById("prizeContainer").style.display =  'flex'
    document.getElementById("prizeContainer").style.pointerEvents = 'auto'
    document.getElementById("routeGuide").style.display = 'none'
    document.getElementById("default").style.top = 0
  }

  const handleComent = () => {
    const commentsEle = document.getElementById('defaultComments')
    console.log(commentsEle)
    commentsEle.style.display = 'flex'
    // commentsEle.style.zIndex = '99999'
    commentsEle.style.pointerEvents = 'auto'
    document.getElementById("routeGuide").style.display = 'none'
    document.getElementById("default").style.top = 0
  }

  const triggerButton = (button: GamepadButtons, pressed: boolean): void => {
    console.log(button)
    const eventType = pressed ? 'touchgamepadbuttondown' : 'touchgamepadbuttonup'
    const event = new CustomEvent(eventType, { detail: { button } })
    console.log(GamepadButtons)
    document.dispatchEvent(event)
  }

  const openNav = () => {
    const nav = document.querySelector('.guide-container')
    nav.style.display = 'flex'
    nav.style.pointerEvents = 'auto'
    document.getElementById("routeGuide").style.display = 'none'
    document.getElementById("default").style.top = 0
  }

  return ( 
		<div ref = {myRef} style = {
			{
				position: 'relative',
        pointerEvents: 'auto'
			}
		} >
			<div className="profile" style={{display: 'none'}}>
				<img style={{width:posterHeight/6 + 'px',height:posterHeight/6 + 'px'}} onClick={() => openMyAward()} 
        src={getAvatarURLForUser(userAvatarDetails, userId)}  alt=""/>
			</div>
			<div className="dot-box" style={{display: 'none'}}>
				<img className="dot-item" style={{width:posterHeight/8 + 'px'}} src="https://xr-resources.yee.link/BGYimg/information.png" onClick={() => handleComent()} alt=""/>
				<img className="dot-item" style={{width:posterHeight/8 + 'px'}} src="https://xr-resources.yee.link/BGYimg/share.png" onClick={() => openPoster()}  alt=""/>
				<img className='dot-item' style={{width:posterHeight/8 + 'px'}} src="https://xr-resources.yee.link/BGYimg/focusing.png" onClick={() => openNav()}  alt=""/>
			</div>
			{
				/*showPoster && <Poster />*/
			}
		</div>
	);
  // return (
  //   <div className='cloudRenderPage-container' style={{ pointerEvents: 'auto',width:'100vw',height:'100vh' }}>
  //    碧桂园云渲染测试界面
  //   </div>
  // )
}

export default BGYCloudRenderPage
