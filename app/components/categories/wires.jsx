import React from 'react';
import { Component } from './Components';

const Wire = ({ 
    id, 
    name, 
    initposition,
    inputNodeId = null, // ID of the node this wire is connected to (if any)
    outputNodeId = null, // ID of the node this wire is connected to (if any)
    State = 'not connected' // 'connected', 'Not connected'


    }) => {
    return (
        <Component 
            id={id} 
            name={name}
            type="wire"
            initposition={initposition}
            inputNodeId={inputNodeId}
            outputNoodeId={outputNoodeId}
            State={State}

        />
    )
}