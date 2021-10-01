import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useBoolean } from '@fluentui/react-hooks';
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
import IPod from './dto'
import Pod from './Pod'
import './PodList.css'




export interface IPodListState {
  pods: IPod[];
}


// sort function
type FunctionType<T> = (items: T[], columnKey: string, isSortedDescending?: boolean) => T[];
const copyAndSort : FunctionType<IPod> = (items, columnKey, isSortedDescending ) => {
  const key = columnKey as keyof IPod;
  return items.slice(0).sort((a: IPod, b: IPod) => ((isSortedDescending ? a[key] < b[key] : a[key] > b[key]) ? 1 : -1));
};

type ColumnClickHandler = (ev: React.MouseEvent<HTMLElement>, column: IColumn) => void;

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
          maxWidth: 350,
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
          maxWidth: 90,
          isResizable: true,
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          data: 'string',
          isPadded: true,
        },
        {
          key: 'pod-age',
          name: 'Age',
          fieldName: 'age',
          minWidth: 70,
          maxWidth: 90,
          isResizable: true,
          isCollapsible: true,
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
              age = Math.floor(pod.age / 3600).toString() + 'min';
            else
              age = pod.age.toString() + ' sec';
            return <span style={{ display: 'block', textAlign: 'right' }}>{age}</span>;
          },
          isPadded: true,
        },
        {
          key: 'pod-cpu',
          name: 'CPU',
          fieldName: 'cpuPercentage',
          minWidth: 120,
          maxWidth: 250,
          isResizable: true,
          isCollapsible: true,
          data: 'number',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          onRender: (pod: IPod) => {
            var text = pod.cpuUsage + ' / ' + (pod.cpuLimit > 0 ? pod.cpuLimit : '?') + ' millicores'
            return <ProgressIndicator label={text} percentComplete={pod.cpuPercentage} />
          },
          isPadded: false,
        },
        {
          key: 'pod-ram',
          name: 'Memory',
          fieldName: 'ramPercentage',
          minWidth: 120,
          maxWidth: 250,
          isResizable: true,
          isCollapsible: true,
          data: 'number',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
          onRender: (pod: IPod) => {
            var text = pod.ramUsage + ' / ' +  (pod.ramLimit > 0 ? pod.ramLimit : '?') + ' KB'
            return <ProgressIndicator label={text} percentComplete={pod.ramPercentage} />
          },
          isPadded: false,
        },
        {
          key: 'pod-ip',
          name: 'Pod IP',
          fieldName: 'podIp',
          minWidth: 70,
          maxWidth: 90,
          isResizable: true,
          isCollapsible: true,
          data: 'string',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
        },
        {
          key: 'host-ip',
          name: 'Host IP',
          fieldName: 'hostIp',
          minWidth: 70,
          maxWidth: 90,
          isResizable: true,
          isCollapsible: true,
          data: 'string',
          onColumnClick: (ev: React.MouseEvent<HTMLElement>, column: IColumn) : void => { columnClickHandler.current(ev, column); },
        },
      ];
  }, []);


  useEffect(() => {
    var url =  (process.env.REACT_APP_BASE_URL || '').trim() + "/api/pods?";
    url += new URLSearchParams({
      token : k8sToken,
      namespace : k8sNamespace
    }).toString();

    const fetchData = async () => {
        try {
            const response = await fetch(url, {mode:'cors'});
            const json = await response.json();
            if(Array.isArray(json)) {
              setPods(
                copyAndSort( json,  "name", false )
              );
              setErrorMessage(undefined);
            } else {
              if( json.error )
                setErrorMessage(json.error);
            }
        } catch (error) {
            setErrorMessage('GET ' + url + ' failed. ' + error);
        }
    };
    fetchData();
  }, [k8sToken, k8sNamespace]);



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
