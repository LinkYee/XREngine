import './index.scss'
import React, { useEffect, useState } from 'react'
import bgscreen from './screen.png'
interface IniProps {
    screenOrt: boolean
}

const ScreenPage: React.FC<IniProps> = (props) => {
    return (
        <div className='screen-container' style={{ display: props.screenOrt ? 'block' : 'none', zIndex: 99999 }}>
             <img className="" src={bgscreen} alt="" style={{ height: '38%',width:'50%' }} />
        </div>
    );
};

export default ScreenPage;