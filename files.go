package main

import (
	"bufio"
	"bytes"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type FileInfo struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	IsDir     bool   `json:"isDir"`
	Size      *int64 `json:"size,omitempty"` // in bytes
	Time      string `json:"time"`
	Timestamp int64  `json:"timestamp"`
}

// drwxrwxrwt   1 root   root  4096 2021-09-24 12:08 tmp
var timeRegex = regexp.MustCompile("^(?P<other>.+?)\\s+(?P<year>\\d{4,4})\\-(?P<month>\\d{2,2})\\-(?P<day>\\d{2,2})\\s+(?P<hour>\\d{2,2})\\:(?P<minute>\\d{2,2})[^\\s]*(\\s+\\+\\d{4,4})?\\s+(?P<filename>.+)$")
var spaceRegex = regexp.MustCompile("\\s+")

func GetFiles(podName string, containerName string, path string, namespace string, token string) ([]FileInfo, error) {

	cmd := []string{"ls", "-ALl", "--full-time", "--color=never", path}
	buffer, err := execCmd(podName, containerName, namespace, token, cmd)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	// drwxrwxrwt   1 root   root  4096 2021-09-24 12:08 tmp
	scanner := bufio.NewScanner(bytes.NewReader(buffer))
	for scanner.Scan() {
		line := scanner.Text()
		matchedStrings := timeRegex.FindStringSubmatch(line)

		if len(matchedStrings) > 7 {
			mp := make(map[string]string)
			for i, name := range timeRegex.SubexpNames() {
				if i != 0 && name != "" {
					mp[name] = matchedStrings[i]
				}
			}

			path = strings.TrimRight(path, "\\/")
			fileinfo := FileInfo{
				Name: mp["filename"],
				Path: fmt.Sprintf("%s/%s", path, mp["filename"]),
				Time: fmt.Sprintf("%s-%s-%s %s:%s", mp["year"], mp["month"], mp["day"], mp["hour"], mp["minute"]),
			}

			year, _ := strconv.Atoi(mp["year"])
			month, _ := strconv.Atoi(mp["month"])
			day, _ := strconv.Atoi(mp["day"])
			hour, _ := strconv.Atoi(mp["hour"])
			minute, _ := strconv.Atoi(mp["minute"])

			datetime := time.Date(year, time.Month(month), day, hour, minute, 0, 0, time.UTC)
			fileinfo.Timestamp = datetime.Unix()

			splittedStrings := spaceRegex.Split(mp["other"], -1)
			if len(splittedStrings) > 3 {
				if strings.HasPrefix(splittedStrings[0], "d") {
					fileinfo.IsDir = true
				} else {
					size, err := strconv.ParseInt(splittedStrings[len(splittedStrings)-1], 10, 64)
					if err == nil {
						fileinfo.Size = &size
					}
				}
			}

			files = append(files, fileinfo)
		} else {
			fmt.Println("Unable to parse `ls` response :", line)
		}

	}

	return files, nil
}

func DownloadSingleFile(podName string, containerName string, path string, namespace string, token string) (*StdoutChannel, error) {

	cmd := []string{"cat", path}
	return execCmdToChannel(podName, containerName, namespace, token, cmd)
}

func GetFileContent(podName string, containerName string, path string, namespace string, token string) (string, error) {

	cmd := []string{"cat", path}
	return execCmdToFile(podName, containerName, namespace, token, cmd)
}
