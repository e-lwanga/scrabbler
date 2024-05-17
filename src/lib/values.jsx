/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";

export function ValueNotifier(value){
    const listeners=[];

    const listenerIndex=function(listener){
        //chosen implementation
        return listeners.indexOf(listener);
    }

    this.getValue=()=>{
        return value;
    };

    this.setValue=(v,forceAsChanged=false)=>{
        if(!forceAsChanged){
            if(value==v){
                return;
            }
        }
        value=v;
        for(const listener of listeners){
            listener();
        }
    }

    this.addListener=(listener)=>{
        const index=listenerIndex(listener);
        if(!(index>=0)){
            listeners.push(listener);
        }
    }

    this.removeListener=(listener)=>{
        const index=listenerIndex(listener);
        if(index>=0){
            listeners.splice(index,1);
        }
    }


    this.notifyUpdate = function (invokable = null) {
        if (invokable!=null) {
            invokable(value);
        }
        for (const listener of listeners) {
            listener();
        }
    }
}




export function ValueNotifiersListener({
    valueNotifiers,
    builder,
}){
    const initValues=[];
    for(const valueNotifier of valueNotifiers){
        initValues.push(valueNotifier.getValue());
    }

    const [values,setValues]=useState(initValues);

    const runner=function(){
        const newValues=[];
        for(const valueNotifier of valueNotifiers){
            newValues.push(valueNotifier.getValue());
        }
        setValues(newValues);
    }

    const valuesListener=()=>{
        runner();
    }

    useEffect(()=>{
        for(const valueNotifier of valueNotifiers){
            valueNotifier.addListener(valuesListener);
        }
        const missedAChange=function(){
            for(let i=0;i<valueNotifiers.length;i++){
                if(valueNotifiers[i].getValue!=values[i]){
                    return true;
                }
            }
            return false;
        }();
        if(missedAChange){
            runner();
        }
        return ()=>{
            for(const valueNotifier of valueNotifiers){
                valueNotifier.removeListener(valuesListener);
            }
        };
    },[]);

    return builder();
}