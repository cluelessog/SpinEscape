# PowerShell script to create GitHub repository and push code
# This script uses GitHub API to create a repository

param(
    [string]$RepoName = "SpinEscape",
    [string]$Description = "A hyper-casual Android game built with HTML5 Canvas and Apache Cordova",
    [string]$Visibility = "public",  # or "private"
    [string]$GitHubToken = ""
)

# Check if token is provided
if (-not $GitHubToken) {
    Write-Host "GitHub Personal Access Token is required." -ForegroundColor Yellow
    Write-Host "Please create a token at: https://github.com/settings/tokens" -ForegroundColor Yellow
    Write-Host "Required scope: 'repo' (Full control of private repositories)" -ForegroundColor Yellow
    Write-Host ""
    $GitHubToken = Read-Host "Enter your GitHub Personal Access Token"
}

if (-not $GitHubToken) {
    Write-Host "Error: GitHub token is required" -ForegroundColor Red
    exit 1
}

# GitHub API endpoint
$apiUrl = "https://api.github.com/user/repos"
$headers = @{
    "Authorization" = "token $GitHubToken"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "PowerShell"
}

# Repository data
$repoData = @{
    name = $RepoName
    description = $Description
    private = ($Visibility -eq "private")
    auto_init = $false
} | ConvertTo-Json

Write-Host "Creating repository '$RepoName' on GitHub..." -ForegroundColor Cyan

try {
    # Create repository
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $repoData -ContentType "application/json"
    
    $repoUrl = $response.html_url
    $cloneUrl = $response.clone_url
    
    Write-Host "Repository created successfully!" -ForegroundColor Green
    Write-Host "Repository URL: $repoUrl" -ForegroundColor Green
    
    # Add remote and push
    Write-Host "Adding remote origin..." -ForegroundColor Cyan
    git remote add origin $cloneUrl
    
    if ($LASTEXITCODE -ne 0) {
        # Remote might already exist, try to set-url
        git remote set-url origin $cloneUrl
    }
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push -u origin master
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
        Write-Host "Repository: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "Error pushing to GitHub. Please check your credentials." -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error creating repository: $_" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Authentication failed. Please check your GitHub token." -ForegroundColor Red
    } elseif ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "Repository might already exist or name is invalid." -ForegroundColor Red
    }
    exit 1
}
