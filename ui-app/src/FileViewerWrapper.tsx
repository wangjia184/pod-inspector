import React from 'react';
import { FontIcon } from '@fluentui/react/lib/Icon';
import { Text } from '@fluentui/react/lib/Text';
import { Stack } from '@fluentui/react';
import { Separator } from '@fluentui/react/lib/Separator';
import FileViewer from './FileViewer'




const FileViewWrapper: React.FunctionComponent = (props : any) => {

  const k8sNamespace = props.match.params.namespace;
  const podName = props.match.params.pod;
  const containerName = props.match.params.container;
  const filepath = '/' + props.match.params.filepath;

  return (
    <>
      
      <div style={{width : '98%', margin: '0 auto'}}>
        <Stack horizontal tokens={{ childrenGap: 10, }} styles={{
          root : {
            flexGrow : 1,
            alignSelf : 'flex-start',
            marginTop: '20px'
          }
        }}>
          <Stack.Item disableShrink>
            <Text variant="large" nowrap>{podName} </Text>
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
            <Text variant="large" nowrap>{filepath} </Text>
          </Stack.Item>
        </Stack>
        <Separator />
        <FileViewer podName={podName} containerName={containerName} filePath={filepath || ''} k8sNamespace={k8sNamespace} />
      </div>
    </>
  );
};


export default FileViewWrapper;
