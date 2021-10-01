import React, { useState, useEffect } from "react";

export const getStorageValue = function(key : string, defaultValue : any) {
  // getting stored value
  const saved = localStorage.getItem(key);
  const initial = JSON.parse(saved!);
  return initial || defaultValue;
}

export const useLocalStorage = (key : string, defaultValue : any) => {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    // storing input name
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};



export const K8sToken = React.createContext('K8S_TOKEN');
export const K8sNamespace = React.createContext('K8S_NAMESPACE');