package main

func GetPsResult(podName string, containerName string, namespace string, token string) ([]byte, error) {

	cmd := []string{"ps", "auxf"}
	return execCmd(podName, containerName, namespace, token, cmd)
}
