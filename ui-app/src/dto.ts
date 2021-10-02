
export interface IContainer {
  ready: boolean;
  restartCount: number;
  cpuUsage: number;
  cpuLimit: number;
  ramUsage: number;
  ramLimit: number;
}

export interface IPodFile {
  name: string;
  path: string;
  isDir: boolean;
  size: number | undefined;
  time: string;
  timestamp: number;
}

export default interface IPod {
  name: string;
  status: string;
  age: number;
  ready: number;
  hostIp: string;
  podIp: string;
  cpuUsage: number;
  cpuLimit: number;
  cpuPercentage: number;
  ramUsage: number;
  ramLimit: number;
  ramPercentage: number;
  containers : Map<string, IContainer>;
}


