import './login.scss'
import React, { useEffect, useState } from 'react'
import Axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosInstance,
} from "axios";

//import  logs  from '../component/logAdd';

import CommonTip from '../component/commenTip'
import Screen from '../component/screen'
import { NotificationService } from "@xrengine/client-core/src/common/services/NotificationService";
import { LoadingCircle } from '@xrengine/client-core/src/components/LoadingCircle'
import { isWx } from '../../wxapi';

interface IntProps {
  loginFn: Function
}

const LoginPage: React.FC<IntProps> = (props) => {
  const [loginState, setLoginState] = useState<string>('');
  const [phoneNumber, setPhoneNum] = useState<string>('');
  const [code, setCode] = useState<string>('')
  const [tipText, settipText] = useState<string>('')
  const [showTip, setshowTip] = useState<boolean>(false)
  const [radio, setRadio] = useState<string>('')
  const [count, setcount] = useState<number>(0)
  const [showBtn, setshowBtn] = useState<boolean>(true)
  const [timeCount, settimeCount] = useState<number>(60)
  let timer: any = null
  // let weixincode;
  let shareId = ''
  const [isWxWeb, setIsWeiXinWeb] = useState<boolean>(false)
  const [screenOrt, setscreenOrt] = useState<boolean>(false)
  const [lastcode, setLastcode] = useState('')
  const [showLoading, setShowLoading] = useState<boolean>(false)

  useEffect(() => {
    setScreenOrientation()
  }, [])
  useEffect(() => {
  }, [])
  useEffect(() => {
    // loginToken() //先走token缓存登录
    let isWeixin = isWx() //先判断是否是微信环境
    setIsWeiXinWeb(isWeixin)
    getShareId() //获取链接中携带的推荐人id信息
    if (!isWeixin) return
    getLoginStatus() //一进页面首先判断是不是微信授权成功后携带code来的
  }, [])
  //计时器
  useEffect(() => {
    timer = setInterval(() => {
      if (count > 0 && count <= timeCount) {
        const newCount = count - 1
        setcount(newCount);
        console.log(count)
      } else {
        setshowBtn(true);
        clearInterval(timer);
        timer = null
      }
    }, 1000);
    return () => {
      clearInterval(timer);
    }
  }, [count])

  window.addEventListener("resize", () => {
    setScreenOrientation()
  });

  const loginToken = () => { //根据缓存里的token校验登陆状态、暂未使用
    const token = localStorage.getItem('token')
    if (!token) return
    Axios({
      url: 'https://biz-api.xr-bgy-prd.yee.link/checkToken',  //检查token是否过期接口
      method: 'get',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', token }
    }
    ).then(res => {
      if (res.data.code == 200) {
        if (res.headers.token) { //将登录token记录下来，用作登录校验及后续接口鉴权
          localStorage.setItem('token', res.headers.token)
        }
        props.loginFn(true)
        window.localStorage.setItem('API_LOGIN_ID', res.data.data.id)
      }
    }).catch(err => { })
  }

  //监听横屏竖屏
  const setScreenOrientation = () => {
    if (window.matchMedia("(orientation: portrait)").matches) {
      setscreenOrt(true)
    }
    if (window.matchMedia("(orientation: landscape)").matches) {
      setscreenOrt(false)
    }
  }
  //手机号失去焦点
  const phoneBlur = (val: string) => {
    let reg_tel =
      /^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$/;
    if (!val) {
      setshowTip(true);
      settipText('请输入手机号')
    }
    else if (!reg_tel.test(val)) {
      setshowTip(true)
      settipText('手机号格式错误')
    } else {
      setshowTip(false)
      setPhoneNum(val)
    }
    setTimeout(() => {
      setshowTip(false);
    }, 1000)
  }
  const phoneChange = (val: string) => {
    setPhoneNum(val)
  }
  //验证码
  const codeBlur = (val) => {
    if (!val) {
      setshowTip(true);
      settipText('请输入验证码')
    }
    else {
      setshowTip(false)
      setCode(val)
    }
    setTimeout(() => {
      setshowTip(false);
    }, 1000)
  }
  const codeChange = (val: string) => {
    setCode(val)
  }
  //单选框
  const radioChange = (val) => {
    setRadio(val)
  }
  //获取验证码
  const getCode = () => {
    if (!phoneNumber) {
      TipShow('请输入手机号')
      return false
    }
    let reg_tel =
      /^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$/;
    if (!reg_tel.test(phoneNumber)) {
      setshowTip(true)
      settipText('手机号格式错误')
      setTimeout(() => {
        setshowTip(false);
      }, 1000)
      return false
    }
    Axios({
      url: 'https://biz-api.xr-bgy-prd.yee.link/sendSms',
      method: 'get',
      params: { phoneNumber: phoneNumber },
    }
    ).then((res: AxiosResponse) => {
      if (res.data.code == 200) {
        time();
      } else {
        NotificationService.dispatchNotify(res.data.code + '接口请求失败', { variant: 'error' })
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
      NotificationService.dispatchNotify(message, { variant: 'error' })
      initTimer();
      clearInterval(timer);
    })
  }

  //手机号登录
  const submit = () => {
//    logs({name:'oranges'})
    // props.loginFn(true)//测试用
    setShowLoading(true)
    clearInterval(timer);
    initTimer()
    if (radio && phoneNumber && code) {
      Axios({
        url: 'https://biz-api.xr-bgy-prd.yee.link/checkSMSCode',
        method: 'post',
        data: `phoneNumber=${phoneNumber}&checkSMSCode=${code}&share_id=${shareId}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
      ).then(res => {
        setShowLoading(false)
        if (res.data.code == 200) {
          if (res.headers.token) { //将登录token记录下来，用作登录校验及后续接口鉴权
            localStorage.setItem('token', res.headers.token)
          }
          props.loginFn(true)
          window.localStorage.setItem('API_LOGIN_ID', res.data.data.id)
        } else {
          NotificationService.dispatchNotify(res.data.code + '接口请求失败', { variant: 'error' })
        }
      }).catch(err => {
        setShowLoading(false)
        let { message } = err;
        if (message == "Network Error") {
          message = "后端接口连接异常";
        } else if (message.includes("timeout")) {
          message = "系统接口请求超时";
        } else if (message.includes("Request failed with status code")) {
          message = "系统接口" + message.substr(message.length - 3) + "异常";
        }
        NotificationService.dispatchNotify(message, { variant: 'error' })
      })
    } else {
      setShowLoading(false)
      TipShow('请输入完整信息并同意《用户协议》和《隐私协议')
    }

  }

  //计时器
  const time = () => {
    if (!timer) {
      setcount(timeCount);
      setshowBtn(false);
    }
  };
  //重置计时器
  const initTimer = () => {
    setcount(0)
    setshowBtn(true);
    timer = null
    settimeCount(300);
  };
  //登陆方式
  const PhoneLogin = (event) => {
    setScreenOrientation()
    setLoginState('mobileNum')
  }
  const WeixinLogin = () => {
    getloginInfo()
  }
  // 获取页面路径的code参数
  const getUrlParam = (name) => { // 获取URL指定参数
    var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)') // 构造一个含有目标参数的正则表达式对象
    var r = window.location.search.substr(1).match(reg) // 匹配目标参数
    if (r != null) return unescape(r[2])
    //return null // 返回参数值
  }

  const getLoginStatus = async () => {
    let weixincode: any = await getUrlParam('code') // 获取请求路径中带code字段参数的方法
    let lastCode = localStorage.getItem('lastCode')
    if (weixincode === lastCode) return window.location.replace(`${window.location.origin}${window.location.pathname}`)
    if (weixincode) {
      getOpenId(weixincode) // 通过获取到的code，调用后台的接口，取得openId
      localStorage.setItem('lastCode', weixincode)
    }
  }

  const getShareId = async () => {
    let invite = await getUrlParam('invite')
    shareId = invite || ''
  }

  const getloginInfo = async () => {
    const AppId = 'wx0973c8802fd64a69' // 公众号的AppId
    let weixincode: any = await getUrlParam('code') // 获取请求路径中带code字段参数的方法
    const local = window.location.href // 获取当前的页面路径，这就是回调的地址

    if (!weixincode) {
      // setLastcode(weixincode)
      window.location.href = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + AppId + '&redirect_uri=' + encodeURIComponent(local) + '&response_type=code&scope=snsapi_userinfo&state=1#wechat_redirect'
    } else {
      // if (lastcode != weixincode) {
      getOpenId(weixincode) // 通过获取到的code，调用后台的接口，取得openId
      // }

    }
  }

  // 微信登录
  const getOpenId = (code) => {
    setShowLoading(true)
    Axios({
      url: 'https://biz-api.xr-bgy-prd.yee.link/wx/login',
      method: 'POST',
      data: `code=${code}&share_id=${shareId}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(res => {
      setShowLoading(false)
      if (res.data.code == 200) {
        if (res.headers.token) {
          localStorage.setItem('token', res.headers.token)
        }
        props.loginFn(true)
        window.localStorage.setItem('API_LOGIN_ID', res.data.user.id)
      } else {
        NotificationService.dispatchNotify(res.data.code + '接口请求失败', { variant: 'error' })
      }
    }).catch(err => {
      setShowLoading(false)
      let { message } = err;
      if (message == "Network Error") {
        message = "后端接口连接异常";
      } else if (message.includes("timeout")) {
        message = "系统接口请求超时";
      } else if (message.includes("Request failed with status code")) {
        message = "系统接口" + message.substr(message.length - 3) + "异常";
      }
      if (message) {
        NotificationService.dispatchNotify(message, { variant: 'error' })
      }

    })

  }


  //tip
  const TipShow = (text: string) => {
    setshowTip(true);
    settipText(text)
    setTimeout(() => {
      setshowTip(false);
    }, 1500)
  }
  return <div className="loginPage-container" style={{ width: '100%', height: '100%' }}>
    {showLoading ? <div style={{ position: 'absoulte', zIndex: '99999' }}>
      <LoadingCircle />
    </div> : ""}
    {/* 登录选择 */}
    {
      loginState == '' ?
        (
          <div className='loginPage-box'>
            <div className='box-title' >选择登录</div>
            <div className='btn-login' onClick={PhoneLogin}>手机号登录</div>
            {
              isWxWeb && <div className='btn-wx'>
                <img
                  className="wx"
                  src={
                    "http://webxr-qing.oss-cn-hangzhou.aliyuncs.com/model/wx.png"
                  }
                />
                <span className='btn-textWX' onClick={WeixinLogin}>微信登录</span>
              </div>
            }

          </div>
        ) :
        (
          <div className='box-pho'>
            <div className='box-title'>手机号登录</div>
            <div className='pho-login'>
              <input
                className='login-inp'
                placeholder='请输入手机号'
                onChange={(e) => {
                  phoneChange(e.target.value)
                }}
                onBlur={(e) => {
                  phoneBlur(e.target.value)
                }}
              />
            </div>
            <div className='pho-login'>
              <input
                className='inp-val'
                placeholder="请输入验证码"
                onChange={(e) => {
                  codeChange(e.target.value)
                }}
                onBlur={(e) => {
                  codeBlur(e.target.value)
                }}
              />
              <div className="val-number">{ }
                {
                  showBtn ? (
                    <span onClick={getCode} >获取验证码</span>
                  ) : (
                    <span>剩余{count}s</span>
                  )
                }


              </div>
              {/* <span className='val-number' onClick={getCode} >获取验证码</span> */}
            </div>
            <div className='box-login' onClick={submit}>登录</div>
            <div className='agreement'>
              <label className='agreement-text'>
                <input
                  onChange={(e) => {
                    radioChange(e.target.value)
                  }}
                  type="radio" name='gender' value="我已阅读并同意《用户协议》和《隐私协议》"
                />我已阅读并同意《用户协议》和《隐私协议》</label>
            </div>
          </div>
        )
    }
    <CommonTip tipText={tipText} showTip={showTip} />
    <Screen screenOrt={screenOrt} />
  </div>
}

export default LoginPage
