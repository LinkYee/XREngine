import React, { Fragment, useEffect, useState } from 'react'
import LoginPage from '../login/login';
import RolePage from '../userRole';

export const BgyCloudClientLoginPage = (): any => {
  const [islogin, setIsLogin] = useState<boolean>(false);

  const loginFn = (e) => {
    setIsLogin(e)
  }
  useEffect(() => {
    // getCode()
  }, [])
  return (
    <div className='homePage-container' style={{ pointerEvents: 'auto',width:'100vw',height:'100vh' }}>
      {
        !islogin ?
          (
            <LoginPage loginFn={loginFn}></LoginPage>
          )
          : (
            <RolePage isCloud={true}></RolePage>
          )
      }


    </div>
  )
}

export default BgyCloudClientLoginPage
