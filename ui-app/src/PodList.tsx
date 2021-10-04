import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useBoolean, useSetTimeout } from '@fluentui/react-hooks';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { DetailsListLayoutMode, SelectionMode,  IColumn } from '@fluentui/react/lib/DetailsList';
import { ShimmeredDetailsList } from '@fluentui/react/lib/ShimmeredDetailsList';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';
import { Panel, PanelType, IPanelProps } from '@fluentui/react/lib/Panel';
import { IRenderFunction } from '@fluentui/react/lib/Utilities';
import { Text } from '@fluentui/react/lib/Text';
import { Dropdown, IDropdownOption } from '@fluentui/react/lib/Dropdown';
import { Stack, IStackTokens } from '@fluentui/react';
import { K8sToken, K8sNamespace } from './utils'
import { mergeStyleSets } from '@fluentui/react/lib/Styling';

import IPod from './dto'
import Pod from './Pod'
import './PodList.css'

const classNames = mergeStyleSets({
  progressBar: {
    '.ms-ProgressIndicator-itemName': {
      direction : 'ltr',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      fontFamily: "monospace, 'Courier New', Courier",
    } 
  },
});



export interface IPodListState {
  pods: IPod[];
}


// sort function
type FunctionType<T> = (items: T[], columnKey: string, isSortedDescending?: boolean) => T[];


type ColumnClickHandler = (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void;

var timer : number = 0;

const PodList: React.FunctionComponent = () => {
  const k8sToken = useContext(K8sToken);
  const k8sNamespace = useContext(K8sNamespace);
  const [defaultContainer, setDefaultContainer] = useState<string>("");
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  const [dropDownOptions, setDropDownOptions] = useState<IDropdownOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [pods, setPods] = useState<IPod[] | undefined>(undefined);
  const [selectedPod, setSelectedPod] = useState<IPod | undefined>(undefined);
  const [isPanelOpen, { setTrue: openPanel, setFalse: dismissPanel }] = useBoolean(false);
  const columnsHolder = useRef<IColumn[]>([]);
  const columnClickHandler = useRef<ColumnClickHandler>((ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => {});
  const sortedColumn = useRef<string>("name");
  const sortedDescending = useRef<boolean>(false);

  const { setTimeout, clearTimeout } = useSetTimeout();

  const copyAndSort : FunctionType<IPod> = (items, columnKey, isSortedDescending ) => {
    sortedColumn.current = columnKey;
    sortedDescending.current = isSortedDescending ? true : false;
    const key = columnKey as keyof IPod;
    return items.slice(0).sort((a: IPod, b: IPod) => ((isSortedDescending ? a[key] < b[key] : a[key] > b[key]) ? 1 : -1));
  };

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

			if (pods != null) {
        setPods(
					copyAndSort(
						pods,
						currColumn.fieldName!,
						currColumn.isSortedDescending
					)
				);
      }
				
    };
  }, [pods]);


  // initialize columns
  useEffect(() => {
    columnsHolder.current = [
        {
          key: 'pod-name',
          name: 'Pod Name',
          fieldName: 'name',
          minWidth: 210,
          maxWidth: 450,
          isRowHeader: true,
          isResizable: true,
          isSorted: true,
          isSortedDescending: false,
          sortAscendingAriaLabel: 'Sorted A to Z',
          sortDescendingAriaLabel: 'Sorted Z to A',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          data: 'string',
          isPadded: true,
        },
        {
          key: 'pod-status',
          name: 'Status',
          fieldName: 'status',
          minWidth: 70,
          maxWidth: 100,
          isResizable: true,
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          data: 'string',
          isPadded: true,
        },
        {
          key: 'pod-ready',
          name: 'Ready',
          fieldName: 'ready',
          minWidth: 70,
          maxWidth: 100,
          isResizable: true,
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          data: 'number',
          isPadded: false,
          headerClassName : 'DetailsListColumnRight',
          onRender: (pod: IPod) => {
            var count = 0;
            for( var _ in pod.containers ){
              count++;
            }
            var text = pod.ready + ' / ' + count;
            return <span style={{ display: 'block', textAlign: 'right' }}>{text}</span>;
          },
        },
        {
          key: 'pod-age',
          name: 'Age',
          fieldName: 'age',
          minWidth: 70,
          maxWidth: 100,
          isResizable: true,
          isCollapsible: true,
          isPadded: false,
          data: 'number',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          headerClassName : 'DetailsListColumnRight',
          onRender: (pod: IPod) => {
            var age = "";
            if( pod.age > 86400 )
              age = Math.floor(pod.age / 86400).toString() + ' day';
            else if( pod.age > 3600 )
              age = Math.floor(pod.age / 3600).toString() + ' hour';
            else if( pod.age > 60 )
              age = Math.floor(pod.age / 60).toString() + ' min';
            else
              age = pod.age.toString() + ' sec';
            return <span style={{ display: 'block', textAlign: 'right' }}>{age}</span>;
          },
        },
        {
          key: 'pod-cpu',
          name: 'CPU',
          fieldName: 'cpuPercentage',
          minWidth: 200,
          maxWidth: 450,
          isResizable: true,
          isCollapsible: true,
          data: 'number',
          headerClassName : 'DetailsListColumnRight',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          onRender: (pod: IPod) => {
            var text : string;
            if( pod.cpuLimit > 0 ) {
              text = (pod.cpuUsage/1000.0).toFixed(1) + ' / ' +  (pod.cpuLimit/1000.0).toFixed(1) + ' core' 
            } else {
              text = (pod.cpuUsage/1000.0).toFixed(1) + ' core (no limit)' 
            }
            return <div style={{ direction: 'rtl' }}><ProgressIndicator label={text} percentComplete={pod.cpuPercentage} className={classNames.progressBar} /></div>
          },
          isPadded: false,
        },
        {
          key: 'pod-ram',
          name: 'Memory',
          fieldName: 'ramPercentage',
          minWidth: 200,
          maxWidth: 450,
          isResizable: true,
          isCollapsible: true,
          data: 'number',
          headerClassName : 'DetailsListColumnRight',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          onRender: (pod: IPod) => {
            var text : string;
            if( pod.ramLimit > 0 ) {
              if( pod.ramLimit >= 1024 * 1024 ) {
                text = (pod.ramUsage/1048576.0).toFixed(1) + ' / ' + (pod.ramLimit/1048576.0).toFixed(1) + ' GB' 
              } else if( pod.ramLimit >= 1024 ) {
                text = (pod.ramUsage/1024.0).toFixed(1) + ' / ' + (pod.ramLimit/1024.0).toFixed(1) + ' MB' 
              } else   {
                text = pod.ramUsage + ' / ' +  pod.ramLimit + ' KB' 
              }
            } else {
              if( pod.ramUsage >= 1024 * 1024 ) {
                text = (pod.ramUsage/1048576.0).toFixed(1) + ' GB (no limit)' 
              } else if( pod.ramUsage >= 1024 ) {
                text = (pod.ramUsage/1024.0).toFixed(1) + ' MB (no limit)' 
              } else   {
                text = pod.ramUsage + ' KB (no limit)' 
              }
            }
            return <div style={{ direction: 'rtl' }}><ProgressIndicator label={text} percentComplete={pod.ramPercentage} className={classNames.progressBar} /></div>
          },
          isPadded: false,
        },
        {
          key: 'pod-ip',
          name: 'Pod IP',
          fieldName: 'podIp',
          minWidth: 70,
          maxWidth: 290,
          isResizable: true,
          isCollapsible: true,
          data: 'string',
          headerClassName : 'DetailsListColumnRight',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          onRender: (pod: IPod) => {
            return <span style={{ display: 'block', textAlign: 'right' }}>{pod.podIp}</span>;
          },
        },
        {
          key: 'host-ip',
          name: 'Host IP',
          fieldName: 'hostIp',
          minWidth: 70,
          maxWidth: 290,
          isResizable: true,
          isCollapsible: true,
          data: 'string',
          headerClassName : 'DetailsListColumnRight',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          onRender: (pod: IPod) => {
            return <span style={{ display: 'block', textAlign: 'right' }}>{pod.hostIp}</span>;
          },
        },
      ];
  }, []);

  const reloadPods = useCallback( () => {
    var url =  (process.env.REACT_APP_BASE_URL || '').trim() + "/api/pods?";
    url += new URLSearchParams({ token : k8sToken, namespace : k8sNamespace }).toString();

    const fetchData = async () => {
        try {
            const response = await fetch(url, {mode:'cors'});
            const json = await response.json();
            if(Array.isArray(json)) { // normal response
              setPods(
                copyAndSort( json,  sortedColumn.current, sortedDescending.current )
              );
              setErrorMessage(undefined);
            } else {
              if( json.error )
                setErrorMessage(json.error);
            }
        } catch (error) {
            setErrorMessage('GET ' + url + ' failed. ' + error);
        }
        clearTimeout(timer);
        timer = setTimeout(reloadPods, 5000);
    };
    fetchData();
  }, [k8sToken, k8sNamespace, clearTimeout, setTimeout]);


  useEffect(() => {
    reloadPods();
  }, [reloadPods]);



  /* eslint-disable no-unused-vars */
  const onItemInvoked = useCallback(
    (pod?: IPod): void => {
      if( pod != null){
        let options : IDropdownOption[] = [];
        for( var key in pod.containers ){
          options.push({ key : key, text : key});
        }
        if( options.length > 0 ){
          setSelectedContainer(options[0].key.toString());
          setDefaultContainer(options[0].key.toString());
        }
        setDropDownOptions(options);
        setSelectedPod(pod);
        openPanel();
      }
    },
    [openPanel],
  );

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
          <Text variant="xLarge" nowrap>{selectedPod?.name} </Text>
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <FontIcon aria-label="Compass" iconName="ChevronRight" />
        </Stack.Item>
        <Stack.Item disableShrink align="center">
          <Dropdown options={dropDownOptions} defaultSelectedKey={defaultContainer} onChange={ (evt, option, index) => {
            setSelectedContainer(option?.key?.toString() || "");
          }} />
        </Stack.Item>
      </Stack>
    ),
    [selectedPod, dropDownOptions, defaultContainer],
  );

  

  return (
    <>
      { errorMessage && <MessageBar messageBarType={MessageBarType.error} isMultiline={false}>{errorMessage}</MessageBar> }
      <ShimmeredDetailsList
        items={pods || []}
        compact={true}
        columns={columnsHolder.current}
        enableShimmer={pods === undefined}
        selectionMode={SelectionMode.none}
        setKey="pods"
        layoutMode={DetailsListLayoutMode.justified}
        onItemInvoked={onItemInvoked}
        className="PodList"
      />
      <Panel
        headerText={selectedPod?.name}
        onRenderHeader={onRenderPanelHeader}
        isOpen={selectedPod !== undefined && isPanelOpen}
        type={PanelType.large}
        onDismiss={dismissPanel}
        isLightDismiss={true}
        isBlocking={true}
        closeButtonAriaLabel="Close"
      >
        <Pod value={selectedPod!!} containerName={selectedContainer} />
      </Panel>
    </>
  );
};

const horizontalGapStackTokens: IStackTokens = {
  childrenGap: 10,
};

export default PodList;
