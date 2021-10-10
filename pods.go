package main

import (
	"context"
	"math"
	"time"

	corev1 "k8s.io/api/core/v1"
	_ "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	_ "k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	_ "k8s.io/client-go/tools/remotecommand"
	metrics "k8s.io/metrics/pkg/client/clientset/versioned"
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

type K8sContainer struct {
	Ready        bool  `json:"ready"`
	RestartCount int32 `json:"restartCount"`
	CpuUsage     int64 `json:"cpuUsage"` // 1 Core = 1000 milli
	CpuLimit     int64 `json:"cpuLimit"` // 1 Core = 1000 milli

	RamUsage int64 `json:"ramUsage"` // KB
	RamLimit int64 `json:"ramLimit"` // KB

}

type K8sPod struct {
	Name          string                  `json:"name"`
	Status        corev1.PodPhase         `json:"status"`
	Age           int64                   `json:"age"`
	Ready         int64                   `json:"ready"`
	HostIp        string                  `json:"hostIp"`
	PodIp         string                  `json:"podIp"`
	CpuUsage      int64                   `json:"cpuUsage"` // 1 Core = 1000 milli
	CpuLimit      int64                   `json:"cpuLimit"` // 1 Core = 1000 milli
	CpuPercentage float32                 `json:"cpuPercentage"`
	RamUsage      int64                   `json:"ramUsage"` // KB
	RamLimit      int64                   `json:"ramLimit"` // KB
	RamPercentage float32                 `json:"ramPercentage"`
	Containers    map[string]K8sContainer `json:"containers"`
}

func GetPods(namespace string, token string) ([]K8sPod, error) {
	podMap := make(map[string]*K8sPod)

	config, err := loadConfig(token)
	if err != nil {
		return nil, err
	}

	// create clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// get pod list
	pl, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	for _, item := range pl.Items {
		metadata := item.GetObjectMeta()
		if metadata != nil {
			pod := K8sPod{
				Name:       metadata.GetName(),
				Status:     item.Status.Phase,
				HostIp:     item.Status.HostIP,
				PodIp:      item.Status.PodIP,
				Containers: make(map[string]K8sContainer),
				Ready:      0,
				CpuUsage:   -1,
				RamUsage:   -1,
			}

			if item.Status.StartTime != nil {
				pod.Age = int64(time.Now().UTC().Sub(item.Status.StartTime.UTC()).Seconds())
			}

			for _, cs := range item.Status.ContainerStatuses {
				pod.Containers[cs.Name] = K8sContainer{
					Ready:        cs.Ready,
					RestartCount: cs.RestartCount,
					CpuUsage:     -1,
					RamUsage:     -1,
				}
				if cs.Ready {
					pod.Ready++
				}
			}

			for _, c := range item.Spec.Containers {
				if container, ok := pod.Containers[c.Name]; ok {
					cpuLimit := c.Resources.Limits.Cpu()
					if cpuLimit != nil {
						container.CpuLimit = cpuLimit.ScaledValue(resource.Milli)
						pod.CpuLimit += container.CpuLimit
					}
					ramLimit := c.Resources.Limits.Memory()
					if ramLimit != nil {
						container.RamLimit = ramLimit.ScaledValue(resource.Kilo)
						pod.RamLimit += container.RamLimit
					}
					pod.Containers[c.Name] = container
				}
			}
			podMap[metadata.GetName()] = &pod
		}
	}

	// metrics clientset
	mc, err := metrics.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// get metrics
	pml, err := mc.MetricsV1beta1().PodMetricses(namespace).List(context.TODO(), metav1.ListOptions{})
	if err == nil {
		// merge into result
		for _, item := range pml.Items {
			metadata := item.GetObjectMeta()
			if metadata != nil {
				if pod, ok := podMap[metadata.GetName()]; ok {

					for _, c := range item.Containers {
						if container, ok := pod.Containers[c.Name]; ok {
							cpuUsage := c.Usage.Cpu()
							if cpuUsage != nil {
								container.CpuUsage = cpuUsage.ScaledValue(resource.Milli)
								if pod.CpuUsage < 0 {
									pod.CpuUsage = 0
								}
								pod.CpuUsage += container.CpuUsage

								if pod.CpuLimit > 0 {
									percentage := float64(pod.CpuUsage) / (float64(pod.CpuLimit) * float64(1.0))
									pod.CpuPercentage = float32(math.Round(percentage*1000)) / float32(1000.0)
								}
							}
							ramUsage := c.Usage.Memory()
							if ramUsage != nil {
								container.RamUsage = ramUsage.ScaledValue(resource.Kilo)
								if pod.RamUsage < 0 {
									pod.RamUsage = 0
								}
								pod.RamUsage += container.RamUsage

								if pod.RamLimit > 0 {
									percentage := float64(pod.RamUsage) / (float64(pod.RamLimit) * float64(1.0))
									pod.RamPercentage = float32(math.Round(percentage*1000)) / float32(1000.0)
								}
							}
							pod.Containers[c.Name] = container
						}
					}
				}
			}
		}
	} // if err == nil

	pods := make([]K8sPod, 0, len(podMap))
	for _, pod := range podMap {
		pods = append(pods, *pod)
	}

	return pods, nil
}
