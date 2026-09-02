@echo off
title Push to GitHub (febin9626)
cd /d "%~dp0"
echo ========================================================
echo   Pushing LUMINA Exhibition to github.com/febin9626/lumina-gallery...
echo ========================================================
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/febin9626/lumina-gallery.git
git push -u origin main
echo ========================================================
echo   Push complete! 
echo ========================================================
pause
