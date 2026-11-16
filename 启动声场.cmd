@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动声场。看到 Local 地址后，请打开 http://localhost:5173
echo 保持此窗口开启；关闭窗口即可停止网站。
call npm.cmd run dev
pause
