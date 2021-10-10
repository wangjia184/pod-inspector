import React, { useRef, useEffect, useCallback, useState, useContext } from 'react';
import { useBoolean } from '@fluentui/react-hooks';
import { MessageBar, MessageBarType, TooltipHost, IRenderFunction } from '@fluentui/react';
import { Separator } from '@fluentui/react/lib/Separator';
import { TextField } from '@fluentui/react/lib/TextField';
import { Text } from '@fluentui/react/lib/Text';
import { ActionButton, IconButton } from '@fluentui/react/lib/Button';
import { Stack, IStackTokens } from '@fluentui/react';
import { DetailsListLayoutMode, SelectionMode, IColumn, IDetailsHeaderProps, IDetailsColumnRenderTooltipProps } from '@fluentui/react/lib/DetailsList';
import { ShimmeredDetailsList } from '@fluentui/react/lib/ShimmeredDetailsList';
import { mergeStyleSets } from '@fluentui/react/lib/Styling';
import { Icon } from '@fluentui/react/lib/Icon';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { Panel, PanelType, IPanelProps } from '@fluentui/react/lib/Panel';
import { Link } from '@fluentui/react/lib/Link';
import { getFileTypeIconProps } from '@fluentui/react-file-type-icons';
import FileViewer from './FileViewer'
import { K8sToken, K8sNamespace } from './utils'
import IPod, { IPodFile } from './dto'


const classNames = mergeStyleSets({
  fileIconHeaderIcon: {
    padding: 0,
    fontSize: '16px',
  },
  fileIconCell: {
    textAlign: 'center',
    selectors: {
      '&:before': {
        content: '.',
        display: 'inline-block',
        verticalAlign: 'middle',
        height: '100%',
        width: '0px',
        visibility: 'hidden',
      },
    },
  },
  fileIconImg: {
    verticalAlign: 'middle',
    maxHeight: '16px',
    maxWidth: '16px',
  },
  controlWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  selectionDetails: {
    marginBottom: '20px',
  },
  grid: {
    overflowX: 'hidden',
    width: '100%',
    '& [role=grid]': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'start',
      height: 'calc(100vh - 200px)'
    },
    '.ms-DetailsList-headerWrapper' : {
      flex: '0 0 auto'
    },
    '.ms-DetailsList-contentWrapper' : {
      width: '100%',
      flex: '1 1 auto',
      overflowY: 'auto',
      overflowX: 'hidden'
    },
    '.ms-DetailsRow-cell' : {
      display: 'flex',
      fontSize: '14px',
      alignItems: "center",
    }
  }
});


const onRenderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (props, defaultRender) => {
  if (!props) {
    return null;
  }
  const onRenderColumnHeaderTooltip: IRenderFunction<IDetailsColumnRenderTooltipProps> = (
    tooltipHostProps
  ) => <TooltipHost {...tooltipHostProps} />;
  return defaultRender!({
    ...props,
    onRenderColumnHeaderTooltip
  });
};

// sort function
type FunctionType<T> = (items: T[], columnKey: string, isSortedDescending?: boolean) => T[];
const copyAndSort : FunctionType<IPodFile> = (items, columnKey, isSortedDescending ) => {
  const key = columnKey as keyof IPodFile;
  return items.slice(0).sort((a: IPodFile, b: IPodFile) => {
    if(a.isDir && !b.isDir ) return -1;
    if(!a.isDir && b.isDir ) return 1;
    return (isSortedDescending ? (a[key] || 0) < (b[key] || 0) : (a[key] || 0) > (b[key] || 0)) ? 1 : -1;
  });
};

type ColumnClickHandler = (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void;






export interface IFileExplorerComponentProps {
  pod : IPod,
  containerName : string,
}


const FileExplorer: React.FunctionComponent<IFileExplorerComponentProps> = ({ pod, containerName }) => {

  const k8sToken = useContext(K8sToken);
  const k8sNamespace = useContext(K8sNamespace);
  const pathRef = useRef("/");

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isLoading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<IPodFile[]>([]);
  const columnsHolder = useRef<IColumn[]>([]);
  const columnClickHandler = useRef<ColumnClickHandler>((ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => {});

  const [selectedFile, setSelectedFile] = useState<IPodFile | undefined>(undefined);
  const [isPanelOpen, { setTrue: openPanel, setFalse: dismissPanel }] = useBoolean(false);


  useEffect(() => {
    columnClickHandler.current = (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => {

      const currColumn: IColumn = columnsHolder.current.filter(
				(currCol) => column.key === currCol.key
			)[0];
			columnsHolder.current.forEach((col: IColumn) => {
				if (col === currColumn) {
					col.isSortedDescending = !col.isSortedDescending;
					col.isSorted = true;
				} else {
					col.isSorted = false;
					col.isSortedDescending = true;
				}
			});

			if (files != null) {
        setFiles(
					copyAndSort(
						files,
						currColumn.fieldName!,
						currColumn.isSortedDescending
					)
				);
      }
				
    };
  }, [files]);

  // download file
  const downloadFile = useCallback( (file:IPodFile) => {
    let currentPodName = pod.name;
    let currencyContainerName = containerName;
    var url =  (process.env.REACT_APP_BASE_URL || '').trim() + "/api/pod/" + currentPodName + '/' + currencyContainerName + '/file/download?';
    url += new URLSearchParams({
      token : k8sToken,
      namespace : k8sNamespace,
      path : file.path,
    }).toString();
    window.open(url, "_blank");
  }, [containerName, pod, k8sToken, k8sNamespace]);

  // view file
  const viewFile = useCallback( (file:IPodFile) => {
    setSelectedFile(file);
    openPanel();
  }, [openPanel]);

  // initialize columns
  useEffect(() => {
    pathRef.current = "/";
    setFiles([]);
    setLoading(false);
    setErrorMessage("");
    columnsHolder.current = [
      {
        key: 'file-type',
        name: 'File Type',
        className: classNames.fileIconCell,
        iconClassName: classNames.fileIconHeaderIcon,
        iconName: 'Page',
        isIconOnly: true,
        fieldName: 'name',
        minWidth: 16,
        maxWidth: 16,
        onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
        onRender: (file: IPodFile) => {
          if( !file.isDir ){
            let index = file.name.lastIndexOf('.');
            let extension = index > 0 ? file.name.substr(index+1) : file.name;
            return <Icon {...getFileTypeIconProps({ extension: extension, size: 16 })} />
          } else {
            return <Icon {...getFileTypeIconProps({type: 2, size: 16 })} />
          }
          
        },
      },
      {
        key: 'file-name',
        name: 'File Name',
        fieldName: 'name',
        minWidth: 210,
        maxWidth: 2000,
        isRowHeader: true,
        isResizable: true,
        isSorted: true,
        isSortedDescending: false,
        sortAscendingAriaLabel: 'Sorted A to Z',
        sortDescendingAriaLabel: 'Sorted Z to A',
        onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
        data: 'string',
        isPadded: true,
        onRender: (file: IPodFile) => {
          if( file.isDir ){
            return <span>{file.name}</span>
          } else {
            var func = (function(){
              return function() {
                arguments[0].preventDefault();
                onItemInvoked(file);
              };
            })();
            let url = '/#/' + k8sNamespace + '/' + pod.name + '/' + containerName + file.path;
            return <Link href={url} target="_blank" onClick={func}>{file.name}</Link>
          }
        },
      },
      {
        key: 'time',
        name: 'Time',
        fieldName: 'timestamp',
        minWidth: 170,
        maxWidth: 200,
        isResizable: true,
        onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
        data: 'string',
        isPadded: true,
        onRender: (file: IPodFile) => {
          return <span>{file.time}</span>;
        },
      },
      {
        key: 'file-size',
        name: 'Size',
        fieldName: 'size',
        minWidth: 150,
        maxWidth: 200,
        isResizable: true,
        isCollapsible: true,
        data: 'number',
        onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
        isPadded: false,
        onRender: (file: IPodFile) => {
          let size = '';
          if( file.size != null){
            if( file.size >= 1073741824 ) {
              size = (Math.floor(file.size / 1073741824 * 10) / 10).toString() + ' GB';
            } else if( file.size >= 1048576 ) {
              size = (Math.floor(file.size / 1048576 * 10) / 10).toString() + ' MB';
            } else if( file.size >= 1024 ) {
              size = (Math.floor(file.size / 1024)).toString() + ' KB';
            } else {
              size = file.size + ' B';
            }
          }
          return <span>{size}</span>;
        },
      },
      {
        key: 'file-action',
        name: 'Action',
        fieldName: 'name',
        minWidth: 100,
        maxWidth: 100,
        isResizable: false,
        isCollapsible: false,
        data: 'string',
        isPadded: false,
        onRender: (file: IPodFile) => {
          var func1 = (function(){
            return function() {
              downloadFile(file);
            };
          })();
          var func2 = (function(){
            return function() {
              viewFile(file);
            };
          })();
          return <>
              <IconButton iconProps={ { iconName: 'Download' }} title={ "Download " + file.name } disabled={file.isDir} onClick={func1} />
              <IconButton iconProps={ { iconName: 'TextDocument' }} title={ "View " + file.name } disabled={file.isDir} onClick={func2} />
            </>
        },
      },
    ];
  }, [pod, containerName, downloadFile, viewFile]);


  const loadFileList = useCallback( () => {
    setLoading(true);
    let currentPodName = pod.name;
    let currencyContainerName = containerName;
    let currentPath = pathRef.current;
    var url =  (process.env.REACT_APP_BASE_URL || '').trim() + "/api/pod/" + currentPodName + '/' + currencyContainerName + '/file/list?';
    url += new URLSearchParams({
      token : k8sToken,
      namespace : k8sNamespace,
      path : currentPath,
    }).toString();
    
    

    const fetchData = async () => {
        try {
            const response = await fetch(url, {mode:'cors'});
            const json = await response.json();
            if(currentPodName !== pod.name || currencyContainerName !== containerName || currentPath !== pathRef.current){
              return; // response is not for the current UI
            }
            
            setLoading(false);
            if(Array.isArray(json)) {
              setFiles(
                copyAndSort( json,  "name", false )
              );
              setErrorMessage(undefined);
            } else {
              if( json.error )
                setErrorMessage(json.error);
            }
        } catch (error) {
          setFiles([]);
          setErrorMessage('GET ' + url + ' failed. ' + error);
          setLoading(false);
        }
    };
    fetchData();
  }, [pod, containerName, k8sToken, k8sNamespace]);

  useEffect( () => {
    loadFileList()
  }, [loadFileList]);

  const onItemInvoked = useCallback(
    (file?: IPodFile): void => {
      if(file && !isLoading){
        if(file.isDir){
          pathRef.current = file.path;

          
          loadFileList();
        } else { // this is a file
          let index = file.name.lastIndexOf('.');
          let extension = index > 0 ? file.name.substr(index+1) : file.name;
          if( extension === "txt" || extension === "log" || extension === "json" || extension === "yml" || extension === "yaml" || extension === "ini" || extension === "js" || extension === "sh" || extension === "css" || extension === "csv" ){
            viewFile(file);
          } else {
            downloadFile(file);
          }
        }
      }
    },
    [loadFileList, viewFile, downloadFile, isLoading],
  );

 
  // go to parent folder
  const onBtnParentClicked = useCallback( () => {
    if(!isLoading) {
      let path = pathRef.current;
      path = path.replace(/\/$/, '');
      let index = path.lastIndexOf('/');
      if(index >= 0)
        pathRef.current = path.substr(0, index) + '/';
      loadFileList();
    }
    
  }, [loadFileList, isLoading]);

  const onRenderPanelHeader: IRenderFunction<IPanelProps> = React.useCallback(
    (props, defaultRender) => (
      <Stack horizontal tokens={horizontalGapStackTokens} styles={{
        root : {
          flexGrow : 1,
          alignSelf : 'flex-start',
          marginLeft : 20
        }
      }}>
        <Stack.Item disableShrink>
          <Text variant="large" nowrap>{pod?.name} </Text>
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <FontIcon aria-label="Compass" iconName="ChevronRight" />
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <Text variant="large" nowrap>{containerName} </Text>
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <FontIcon aria-label="Compass" iconName="ChevronRight" />
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <Text variant="large" nowrap>{selectedFile?.path} </Text>
        </Stack.Item>
      </Stack>
    ),
    [pod, containerName, selectedFile],
  );


  return (
    <>
      <Separator></Separator>
      
      <Stack horizontal>
        <Stack.Item grow>
          <TextField prefix="Folder Path :" underlined styles={{ root: { width: '100%' } }} value={pathRef.current} />
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <ActionButton iconProps={ { iconName : 'FileRequest' }} allowDisabledFocus disabled={isLoading} onClick={onBtnParentClicked}>
          Parent Folder
          </ActionButton>
        </Stack.Item>        
      </Stack>
      
      { errorMessage && <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>{errorMessage}</MessageBar> }
      <ShimmeredDetailsList
            items={files}
            compact={true}
            className={classNames.grid}
            enableShimmer={isLoading}
            columns={columnsHolder.current}
            selectionMode={SelectionMode.none}
            layoutMode={DetailsListLayoutMode.justified}
            isHeaderVisible={true}
            onItemInvoked={onItemInvoked}
            onRenderDetailsHeader={onRenderDetailsHeader}
            onShouldVirtualize={() => false}
          />

      <Panel
        headerText={selectedFile?.path}
        isOpen={selectedFile !== undefined && isPanelOpen}
        type={PanelType.extraLarge}
        onDismiss={dismissPanel}
        isBlocking={true}
        isLightDismiss={true}
        closeButtonAriaLabel="Close"
        onRenderHeader={onRenderPanelHeader}
      >
        <FileViewer podName={pod.name} containerName={containerName} filePath={selectedFile?.path || ''} k8sNamespace={k8sNamespace} />
      </Panel>
    </>
  );
};

const horizontalGapStackTokens: IStackTokens = {
  childrenGap: 10,
};


export default FileExplorer;
