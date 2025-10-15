@echo off
taskkill /F /IM node.exe
cd /d %~dp0
node server.js
pause
