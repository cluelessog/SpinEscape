# GitHub Repository Setup Guide

## Quick Setup (Using GitHub CLI)

If you have GitHub CLI installed:

```powershell
cd SpinEscape
gh auth login
gh repo create SpinEscape --public --source=. --remote=origin --push
```

## Manual Setup (Using GitHub API)

### Step 1: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "SpinEscape Repo"
4. Select scope: **`repo`** (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### Step 2: Run the Setup Script

```powershell
cd SpinEscape
.\create-github-repo.ps1 -GitHubToken "YOUR_TOKEN_HERE"
```

Or if you want to be prompted for the token:

```powershell
cd SpinEscape
.\create-github-repo.ps1
```

### Step 3: Manual Method (Alternative)

If the script doesn't work, you can do it manually:

1. **Create repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `SpinEscape`
   - Description: "A hyper-casual Android game built with HTML5 Canvas and Apache Cordova"
   - Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license
   - Click "Create repository"

2. **Add remote and push:**
   ```powershell
   cd SpinEscape
   git remote add origin https://github.com/YOUR_USERNAME/SpinEscape.git
   git push -u origin master
   ```

## Current Repository Status

- ✅ Git repository initialized
- ✅ Initial commit created
- ✅ README.md added
- ✅ LICENSE added
- ✅ .gitignore configured
- ⏳ Waiting for GitHub remote setup

## Next Steps After Push

Once pushed to GitHub, you can:
- View your repository at: `https://github.com/YOUR_USERNAME/SpinEscape`
- Clone it elsewhere: `git clone https://github.com/YOUR_USERNAME/SpinEscape.git`
- Share it with others
- Set up CI/CD if needed
