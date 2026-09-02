@echo off
title LUMINA Photography Archive
cd /d "%~dp0"
echo =======================================================
echo   Launching LUMINA Exhibition Archive...
echo =======================================================
start "" http://localhost:8080
python server.py
pause
