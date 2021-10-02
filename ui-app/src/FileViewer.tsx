import React, { useEffect, useState, useContext } from 'react';
import AceEditor from "react-ace";
import { K8sToken, K8sNamespace } from './utils'
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-ini";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/theme-monokai";



export interface IFileViewerComponentProps {
  podName : string,
  containerName : string,
  filePath : string,
}


const FileViewer: React.FunctionComponent<IFileViewerComponentProps> = ({ podName, containerName, filePath }) => {

  const k8sToken = useContext(K8sToken);
  const k8sNamespace = useContext(K8sNamespace);
  const [content, setContent] = useState<string>("");
  const [mode, setMode] = useState<string>("text");

  useEffect( () => {
    let currentPodName = podName;
    let currencyContainerName = containerName;
    let currentPath = filePath;
    var url =  (process.env.REACT_APP_BASE_URL || '').trim() + "/api/pod/" + currentPodName + '/' + currencyContainerName + '/file/view?';
    url += new URLSearchParams({
      token : k8sToken,
      namespace : k8sNamespace,
      path : currentPath,
    }).toString();

    let index = filePath.lastIndexOf('.');
    let extName = filePath.substr(index + 1).toLowerCase();
    switch(extName) {
      case 'json':
      case 'css':
      case 'xml':
      case 'yaml':
      case 'sh':
      case 'ini': {
        setMode(extName);
        break;
      }
      case 'config': setMode('xml'); break;
      case 'yml': setMode('yaml'); break;
      case 'js': setMode('javascript'); break;
      default: setMode('text'); break;
    }

    const fetchData = async () => {
        try {
            const response = await fetch(url, {mode:'cors'});
            var text = await response.text();
            if(currentPodName !== podName || currencyContainerName !== containerName || currentPath !== filePath){
              return; // response is not for the current UI
            }
            // escape \033[99m
            
            if(text){
              const regex = /\033[^m\n]{1,20}m/g;
              text = text.replaceAll(regex, '');  // replace escapsed letters
            }
            setContent(text);

        } catch (error) {
          setContent("Error : " + error);
        }
    };
    fetchData();
  }, [podName, containerName, filePath, k8sToken, k8sNamespace]);

  return (
    <AceEditor
      placeholder="Loading ..."
      mode={mode}
      theme="monokai"
      style= {{
        width : '100%',
        height: 'calc(100vh - 70px)'
      }}
      fontSize={14}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={false}
      value={content}
      setOptions={{
        enableBasicAutocompletion: false,
        enableLiveAutocompletion: false,
        enableSnippets: false,
        readOnly: true,
        showLineNumbers: true,
        tabSize: 2,
      }}
    />
  );
};


export default FileViewer;
