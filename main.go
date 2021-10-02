package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {

	var username, password, uiPath string
	port := *flag.Int("port", 8080, "HTTP port to listen")

	flag.StringVar(&username, "user", "", "Username to enable basic-authentication")
	flag.StringVar(&password, "password", "", "Password to enable basic-authentication")
	flag.StringVar(&uiPath, "ui-path", "./www/", "Path of static web sites")
	flag.Parse()

	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	var r *gin.RouterGroup
	if len(username) > 0 && len(password) > 0 {
		r = router.Group("/", gin.BasicAuth(gin.Accounts{
			username: password,
		}))
	} else {
		r = router.Group("/")
	}

	// allow CORS request from localhost
	r.Use(cors.New(cors.Config{
		AllowMethods:     []string{"PUT", "PATCH", "GET", "POST", "DELETE"},
		AllowHeaders:     []string{"Origin"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			if u, err := url.Parse(origin); err == nil {
				hostname := u.Hostname()
				return hostname == "localhost" || hostname == "127.0.0.1"
			}
			return false
		},
		MaxAge: time.Minute,
	}))

	r.GET("/env", getEnv)
	r.GET("/api/pods", getPods)
	r.GET("/api/pod/:pod/:container/file/list", getFiles)
	r.GET("/api/pod/:pod/:container/file/view", viewFile)
	r.GET("/api/pod/:pod/:container/file/download", downloadFile)
	r.GET("/api/pod/:pod/:container/process/list", getProcesses)

	dirPath, err := filepath.Abs(uiPath)
	if err != nil {
		panic(err)
	}

	files, err := ioutil.ReadDir(dirPath)
	if err != nil {
		panic(err)
	}

	// static web sites
	for _, f := range files {
		if f.IsDir() {
			if f.Name() != "." && f.Name() != ".." {
				r.Static("/"+f.Name()+"/", filepath.Join(dirPath, f.Name()))
			}
		} else {

			r.StaticFile("/"+f.Name(), filepath.Join(dirPath, f.Name()))
		}
	}
	r.StaticFile("/", filepath.Join(dirPath, "index.html")) // default page

	fmt.Printf("HTTP listening on port %d\n", port)
	panic(router.Run(fmt.Sprintf(":%d", port)))
}

func getEnv(c *gin.Context) {
	script := fmt.Sprintf("window.POD_NAMESPACE='%s';", os.Getenv("POD_NAMESPACE"))

	c.Data(http.StatusOK, "text/javascript", []byte(script))
}

func getPods(c *gin.Context) {
	namespace := c.Query("namespace")
	token := c.Query("token")
	pods, err := GetPods(namespace, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	} else {
		c.JSON(http.StatusOK, pods)
	}
}

func getFiles(c *gin.Context) {
	podName := c.Param("pod")
	containerName := c.Param("container")
	path := c.DefaultQuery("path", "/")
	namespace := c.Query("namespace")
	token := c.Query("token")
	files, err := GetFiles(podName, containerName, path, namespace, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	} else {
		c.JSON(http.StatusOK, files)
	}
}

func downloadFile(c *gin.Context) {
	podName := c.Param("pod")
	containerName := c.Param("container")
	path := c.DefaultQuery("path", "/")
	namespace := c.Query("namespace")
	token := c.Query("token")

	stdout, err := DownloadSingleFile(podName, containerName, path, namespace, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	defer stdout.Close()

	_, filename := filepath.Split(path)

	w := c.Writer
	header := w.Header()
	header.Set("Content-Description", "File Transfer")
	header.Set("Content-Transfer-Encoding", "binary")
	header.Set("Content-Disposition", "attachment; filename="+filename)
	header.Set("Content-Type", "application/octet-stream")
	header.Set("Transfer-Encoding", "chunked")
	w.WriteHeader(http.StatusOK)

	for {
		select {
		case bufOrErr := <-stdout.Channel():
			{
				if bufOrErr.err != nil {
					fmt.Println("Unable to download file", path, bufOrErr.err)
					goto lbExit
				}
				if bufOrErr.buf == nil {
					goto lbExit
				}
				_, err = w.Write(bufOrErr.buf)
				if err != nil {
					goto lbExit
				}
			}

		case _ = <-time.After(10 * time.Second):
			_, err = w.Write([]byte{})
			if err != nil {
				goto lbExit
			}
			w.(http.Flusher).Flush()
		}
	}
lbExit:
	w.(http.Flusher).Flush()

}

func viewFile(c *gin.Context) {
	podName := c.Param("pod")
	containerName := c.Param("container")
	path := c.DefaultQuery("path", "/")
	namespace := c.Query("namespace")
	token := c.Query("token")

	tempFile, err := GetFileContent(podName, containerName, path, namespace, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, err.Error())
		return
	}
	defer os.Remove(tempFile)

	_, filename := filepath.Split(path)

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/octet-stream")
	c.File(tempFile)

}

func getProcesses(c *gin.Context) {
	podName := c.Param("pod")
	containerName := c.Param("container")
	namespace := c.Query("namespace")
	token := c.Query("token")
	result, err := GetPsResult(podName, containerName, namespace, token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, map[string]string{"error": err.Error()})
	} else {
		c.JSON(http.StatusOK, map[string]string{"result": string(result)})
	}
}
