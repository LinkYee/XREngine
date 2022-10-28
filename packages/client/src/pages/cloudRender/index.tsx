import React, { Fragment, useEffect, useState } from 'react'

export const CloudRenderPage = (): any => {
  const [islogin, setIsLogin] = useState<boolean>(false);

  const loginFn = (e) => {
    setIsLogin(e)
  }
  useEffect(() => {
    // getCode()
  }, [])
  return (
    <div className='cloudRenderPage-container' style={{ pointerEvents: 'auto',width:'100vw',height:'100vh' }}>
     云渲染测试界面
    </div>
  )
}

export default CloudRenderPage
