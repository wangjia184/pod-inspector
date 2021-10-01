package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"

	corev1 "k8s.io/api/core/v1"
	_ "k8s.io/apimachinery/pkg/api/errors"
	_ "k8s.io/apimachinery/pkg/api/resource"
	_ "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/remotecommand"
	"k8s.io/client-go/util/homedir"
	_ "k8s.io/metrics/pkg/client/clientset/versioned"
	//
	// Uncomment to load all auth plugins
	// _ "k8s.io/client-go/plugin/pkg/client/auth"
	//
	// Or uncomment to load specific auth plugins
	// _ "k8s.io/client-go/plugin/pkg/client/auth/azure"
	// _ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
	// _ "k8s.io/client-go/plugin/pkg/client/auth/oidc"
	// _ "k8s.io/client-go/plugin/pkg/client/auth/openstack"
)

func loadConfig(token string) (*rest.Config, error) {

	var kubeconfig string
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = filepath.Join(home, ".kube", "config")
		if _, err := os.Stat(kubeconfig); os.IsNotExist(err) {
			fmt.Println("Local config file %s does not exist", kubeconfig)
		} else {
			config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
			if err == nil {
				if len(token) > 0 {
					config.BearerToken = token
				}
				return config, nil
			}
		}
	}
	config, err := rest.InClusterConfig()
	if err == nil {
		if len(token) > 0 {
			config.BearerToken = token
		}
		return config, nil
	}

	return nil, errors.New(fmt.Sprintf("Failed to load config from %s; Failed to load in-cluster config", kubeconfig))
}

// sizeQueue implements remotecommand.TerminalSizeQueue
type fixedTerminalSizeQueue struct {
}

// make sure sizeQueue implements the resize.TerminalSizeQueue interface
var _ remotecommand.TerminalSizeQueue = &fixedTerminalSizeQueue{}

func (s *fixedTerminalSizeQueue) Next() *remotecommand.TerminalSize {
	size := remotecommand.TerminalSize{
		Width:  3000,
		Height: 8000,
	}
	return &size
}

func execCmd(podName string, containerName string, namespace string, token string, cmd []string) ([]byte, error) {
	config, err := loadConfig(token)
	if err != nil {
		return nil, err
	}

	// create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// https://github.com/kubernetes/kubernetes/blob/release-1.22/test/e2e/framework/exec_util.go
	// https://zhimin-wen.medium.com/programing-exec-into-a-pod-5f2a70bd93bb
	req := clientset.CoreV1().
		RESTClient().
		Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		Param("container", containerName)

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		return nil, err
	}

	parameterCodec := runtime.NewParameterCodec(scheme)
	req.VersionedParams(&corev1.PodExecOptions{
		Stdin:     false,
		Stdout:    true,
		Stderr:    true,
		TTY:       false,
		Container: podName,
		Command:   cmd,
	}, parameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
	if err != nil {
		return nil, err
	}

	var stdout, stderr bytes.Buffer
	err = exec.Stream(remotecommand.StreamOptions{
		Stdin:             nil,
		Stdout:            &stdout,
		Stderr:            &stderr,
		TerminalSizeQueue: &fixedTerminalSizeQueue{},
	})
	if err != nil {
		return nil, err
	}

	return stdout.Bytes(), nil
}

func execCmdToFile(podName string, containerName string, namespace string, token string, cmd []string) (string, error) {
	config, err := loadConfig(token)
	if err != nil {
		return "", err
	}

	// create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return "", err
	}

	// https://github.com/kubernetes/kubernetes/blob/release-1.22/test/e2e/framework/exec_util.go
	// https://zhimin-wen.medium.com/programing-exec-into-a-pod-5f2a70bd93bb
	req := clientset.CoreV1().
		RESTClient().
		Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		Param("container", containerName)

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		return "", err
	}

	parameterCodec := runtime.NewParameterCodec(scheme)
	req.VersionedParams(&corev1.PodExecOptions{
		Stdin:     false,
		Stdout:    true,
		Stderr:    false,
		TTY:       false,
		Container: podName,
		Command:   cmd,
	}, parameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
	if err != nil {
		return "", err
	}

	// create temp file
	tempFile, err := ioutil.TempFile("", "k8s_cmd")
	if err != nil {
		return "", err
	}

	err = exec.Stream(remotecommand.StreamOptions{
		Stdin:             nil,
		Stdout:            tempFile,
		Stderr:            nil,
		TerminalSizeQueue: &fixedTerminalSizeQueue{},
	})
	if err != nil {
		os.Remove(tempFile.Name())
		return "", err
	}

	err = tempFile.Sync()
	if err != nil {
		os.Remove(tempFile.Name())
		return "", err
	}

	defer tempFile.Close()

	return tempFile.Name(), nil
}

type BufOrErr struct {
	buf []byte
	err error
}
type StdoutChannel struct {
	channel chan BufOrErr
	closed  bool
}

func (self *StdoutChannel) Close() {
	self.closed = true
}

func (self *StdoutChannel) Channel() chan BufOrErr {
	return self.channel
}

func (self *StdoutChannel) Write(data []byte) (n int, err error) {
	if self.closed {
		return 0, io.ErrClosedPipe
	}
	n = len(data)
	var buf = make([]byte, n)
	copy(buf, data)
	self.channel <- BufOrErr{buf, nil}
	return n, nil
}

func execCmdToChannel(podName string, containerName string, namespace string, token string, cmd []string) (*StdoutChannel, error) {
	config, err := loadConfig(token)
	if err != nil {
		return nil, err
	}

	// create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// https://github.com/kubernetes/kubernetes/blob/release-1.22/test/e2e/framework/exec_util.go
	// https://zhimin-wen.medium.com/programing-exec-into-a-pod-5f2a70bd93bb
	req := clientset.CoreV1().
		RESTClient().
		Post().
		Resource("pods").
		Name(podName).
		Namespace(namespace).
		SubResource("exec").
		Param("container", containerName)

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		return nil, err
	}

	parameterCodec := runtime.NewParameterCodec(scheme)
	req.VersionedParams(&corev1.PodExecOptions{
		Stdin:     false,
		Stdout:    true,
		Stderr:    false,
		TTY:       false,
		Container: podName,
		Command:   cmd,
	}, parameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
	if err != nil {
		return nil, err
	}

	stdout := StdoutChannel{
		channel: make(chan BufOrErr, 100),
		closed:  false,
	}
	go (func() {
		defer close(stdout.channel)

		err = exec.Stream(remotecommand.StreamOptions{
			Stdin:             nil,
			Stdout:            &stdout,
			Stderr:            nil,
			TerminalSizeQueue: &fixedTerminalSizeQueue{},
		})
		if !stdout.closed {
			if err != nil {
				stdout.channel <- BufOrErr{nil, err}
			} else {
				stdout.channel <- BufOrErr{nil, nil}
			}
		}
		fmt.Println("Ended.")
	})()

	return &stdout, nil
}
