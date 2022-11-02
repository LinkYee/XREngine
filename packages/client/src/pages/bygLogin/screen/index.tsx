import './index.scss'
import React, { useEffect, useState } from 'react'
import bgscreen from './screen.png'
interface IniProps {
    screenOrt: boolean
}

const ScreenPage: React.FC<IniProps> = (props) => {
    return (
        <div className='screen-container-cloud' style={{ display: props.screenOrt ? 'block' : 'none', zIndex: 9999999 }}>
             <img className="" src={bgscreen} alt="" style={{ height: '80%',width:'38%' }} />
        </div>
    );
};

export default ScreenPage;