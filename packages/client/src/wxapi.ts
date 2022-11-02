import Axios, {
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  AxiosInstance,
} from "axios";

export const isWx = () => {
  const ua = window.navigator.userAgent.toLowerCase()
  return !!(ua.match(/MicroMessenger/i)?.includes('micromessenger'))
}

export const wxShare = () => { //初始化微信分享卡片
  if (!isWx()) return
  const url = window.location.href
  getConfig(url)
}

const getConfig = async (url) => {
  const { data: { data: wxConfig } } = await Axios.post('https://xr.yee.link/bgy-api/wx/share', {
    url
  }).catch(err => {
    console.log(err)
  })
  if (wxConfig && wxConfig.timestamp && wxConfig.nonceStr && wxConfig.signature) { //获取签名成功
    return setConfig(wxConfig)
  }
  console.log('签名获取失败、或参数缺失', wxConfig)
}

const setConfig = async (obj) => {
  const wx = window['wx'] || null
  if (!wx) return console.log(' 请检查微信sdk加载是否成功')
  wx.config({
    debug: false, // 开启调试模式,调用的所有 api 的返回值会在客户端 alert 出来，若要查看传入的参数，可以在 pc 端打开，参数信息会通过 log 打出，仅在 pc 端时才会打印。
    appId: 'wx0973c8802fd64a69', // 必填，公众号的唯一标识
    timestamp: parseInt(obj.timestamp), // 必填，生成签名的时间戳
    nonceStr: obj.nonceStr, // 必填，生成签名的随机串
    signature: obj.signature,// 必填，签名
    jsApiList: [
      'checkJsApi',
      'onMenuShareAppMessage',
      'onMenuShareTimeline',
      'updateAppMessageShareData',
      'updateTimelineShareData'] // 必填，需要使用的 JS 接口列表
  })
  wx.ready(() => {
    const href = window.location.href
    const userid = localStorage.getItem('API_LOGIN_ID')
    const shareConfig = {
      title: '碧桂园服务元宇宙', // 分享标题
      desc: '分享有礼！快来Pick最佳萌萌哒社区，免费抽千元大礼哦！', // 分享描述
      // link: 'https://act.qingmeta.cn/bgyfw/', // 分享链接，该链接域名或路径必须与当前页面对应的公众号 JS 安全域名一致
      link: `${href}${href.includes('?') ? '&' : '?'}invite=${userid}`, // 分享链接，该链接域名或路径必须与当前页面对应的公众号 JS 安全域名一致
      imgUrl: 'https://xr-resources.yee.link/Share/share.png', // 分享图标
      success: function () {
        // 设置成功
        console.log('设置成功')
      },
      error: (e) => {
        console.log(e, '错误信息')
      }
    }
    if (wx.updateAppMessageShareData) {
      wx.updateAppMessageShareData(shareConfig)
    } else {
      wx.onMenuShareAppMessage(shareConfig)
    }
  })
}