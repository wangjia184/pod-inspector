import React, { useEffect, useState, useContext } from 'react';
import { Separator } from '@fluentui/react/lib/Separator';
import { mergeStyleSets } from '@fluentui/react/lib/Styling';
import { K8sToken, K8sNamespace } from './utils'
import IPod from './dto'


const classNames = mergeStyleSets({
  psResult: {
    padding: 0,
    fontSize: '16px',
    'pre': {
      padding : '5px',
      color: 'white',
      backgroundColor : 'black',
      overflowY: 'auto',
      overflowX: 'auto',
      width: '100%',
      height: 'calc(100vh - 200px)',
      fontFamily : 'monospace, "Lucida Console", Monaco, "Courier New", Courier, fixedsys'
    }
  },
  
});






export interface IProcessExplorerComponentProps {
  pod : IPod,
  containerName : string,
}


const ProcessExplorer: React.FunctionComponent<IProcessExplorerComponentProps> = ({ pod, containerName }) => {

  const k8sToken = useContext(K8sToken);
  const k8sNamespace = useContext(K8sNamespace);
  const [psResult, setPsResult] = useState<string>("");

  useEffect( () => {
    let currentPodName = pod.name;
    let currencyContainerName = containerName;

    var url =  (process.env.REACT_APP_BASE_URL || '').trim() + "/api/pod/" + currentPodName + '/' + currencyContainerName + '/process/list?';
    url += new URLSearchParams({
      token : k8sToken,
      namespace : k8sNamespace,
    }).toString();


    const fetchData = async () => {
        try {
            const response = await fetch(url, {mode:'cors'});
            const json = await response.json();
            if(currentPodName !== pod.name || currencyContainerName !== containerName){
              return; // response is not for the current UI
            }
            setPsResult(json.result);

        } catch (error) {
          setPsResult("Error : " + error);
        }
    };
    fetchData();
  }, [pod, containerName, k8sToken, k8sNamespace]);


  return (
    <>
      <Separator></Separator>
      
      <div className={classNames.psResult}>
        <pre>{psResult}</pre>
      </div>
    </>
  );
};


export default ProcessExplorer;
