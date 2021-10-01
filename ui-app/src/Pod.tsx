import React, { } from 'react';
import { Pivot, PivotItem } from '@fluentui/react';
import FileExplorer from './FileExplorer'
import ProcessExplorer from './ProcessExplorer'
import IPod from './dto'

export interface IPodComponentProps {
  value : IPod,
  containerName : string,
}

const Pod: React.FunctionComponent<IPodComponentProps> = ({ value : pod, containerName }) => {



  return (
    <Pivot>
      
      <PivotItem headerText="File System" itemIcon="DOM">
        <FileExplorer pod={pod} containerName={containerName}/>
      </PivotItem>
      <PivotItem headerText="Processes" itemIcon="Processing">
        <ProcessExplorer pod={pod} containerName={containerName}/>
      </PivotItem>
    </Pivot>
  );
};

export default Pod;
