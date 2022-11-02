import Axios, {
    AxiosRequestConfig,
    AxiosResponse,
    AxiosError,
    AxiosInstance,
  } from "axios";
  
  
  function logs(data){
    console.log('我调用了---------------')
    console.log(data)
    Axios({
      url: 'https://admin-api.xr-bgy-prd.yee.link/log/add',
      method: 'post',
      data: {userId : localStorage.getItem('API_LOGIN_ID'),type:data.type,target:data.target,device:data.device},
      headers: { 'Content-Type': 'application/json' }
    }
    ).then(res => {
      if (res.data.code == 200) {
      //    NotificationService.dispatchNotify(res.data.message, {variant: 'info'})
      }
    }).catch(err => {
      console.error(err)
    })
  }
  
  
  export default logs
  
  