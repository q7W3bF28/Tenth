// GoFile.io 配置
const GOFILE_ACCOUNT_ID = '9e174948-3c6c-47e6-a706-8aedbf7b8598';
const GOFILE_ACCOUNT_TOKEN = '8UO7T53rxM6Eh3WzolDR4SeaLedZ17bE';

// 获取GoFile服务器
async function getGoFileServer() {
    try {
        // 修复：使用正确的API端点
        const response = await fetch('https://api.gofile.io/servers');
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`获取服务器失败，状态码: ${response.status}. 响应: ${errorText}`);
        }
        const data = await response.json();
        if (data.status === 'ok' && data.data && data.data.servers && data.data.servers.length > 0) {
            // 返回第一个可用的服务器
            return data.data.servers[0].name;
        } else {
            throw new Error('无法获取GoFile服务器: ' + (data.status || '未知状态'));
        }
    } catch (error) {
        console.error('获取GoFile服务器错误:', error);
        throw error;
    }
}

// 上传文件到GoFile
async function uploadToGoFile(file, onProgress) {
    try {
        console.log('开始上传文件:', file.name, '大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
        
        // 1. 获取服务器
        const server = await getGoFileServer();
        console.log('使用服务器:', server);
        
        // 2. 创建FormData
        const formData = new FormData();
        formData.append('token', GOFILE_ACCOUNT_TOKEN);
        formData.append('file', file);
        
        // 3. 使用XMLHttpRequest上传以支持进度
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const uploadUrl = `https://${server}.gofile.io/uploadFile`;
            console.log('上传URL:', uploadUrl);
            
            xhr.open('POST', uploadUrl, true);
            
            // 设置超时
            xhr.timeout = 5 * 60 * 1000; // 5分钟
            
            // 进度事件监听
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    console.log('上传进度:', percent + '%');
                    if (onProgress) onProgress(percent);
                }
            });
            
            // 请求完成处理
            xhr.onload = () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('上传响应:', response);
                        if (response.status === 'ok' && response.data) {
                            resolve({
                                directLink: `https://${server}.gofile.io/download/${response.data.fileId}/${response.data.fileName}`,
                                fileId: response.data.fileId,
                                fileName: response.data.fileName,
                                downloadPage: `https://gofile.io/d/${response.data.fileId}`
                            });
                        } else {
                            reject(new Error('上传失败: ' + (response.data?.message || response.status || '未知错误')));
                        }
                    } catch (e) {
                        reject(new Error('服务器返回无效响应: ' + xhr.responseText));
                    }
                } else {
                    reject(new Error(`上传失败，状态码: ${xhr.status}, 响应: ${xhr.responseText}`));
                }
            };
            
            // 错误处理
            xhr.onerror = () => {
                reject(new Error('网络错误，请检查网络连接'));
            };
            
            xhr.onabort = () => {
                reject(new Error('上传已取消'));
            };
            
            xhr.ontimeout = () => {
                reject(new Error('上传超时，请检查网络连接'));
            };
            
            // 4. 发送请求
            xhr.send(formData);
        });
    } catch (error) {
        console.error('上传到GoFile错误:', error);
        throw error;
    }
}
