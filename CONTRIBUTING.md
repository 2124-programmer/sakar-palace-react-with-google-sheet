# Contributing Guide

## Branching Policy

The `main` branch is protected.
Direct commits or direct merges to `main` are not allowed.

All development must follow this flow:

1. Create a feature branch from latest `main`.
2. Implement changes on the feature branch.
3. Run a successful build.
4. Open a Pull Request to `main`.
5. Merge only after checks pass and review is done.

## Standard Workflow

```powershell
git checkout main
git pull origin main
git checkout -b feature/short-description

# develop your changes here
npm.cmd run build

git add .
git commit -m "feat: short summary"
git push -u origin feature/short-description
```

Then create a PR:

- Source: `feature/short-description`
- Target: `main`

## Required Checks Before Merge

- PR must come from a feature branch.
- Build must pass (`npm run build`).
- CI Build GitHub Action must be green.
- Direct push to `main` must not be used.

## Pull Request Checklist

- What changed and why.
- Screenshots for UI changes (if applicable).
- Any environment variable changes.
- Any data format or sheet structure changes.

## Recommended Branch Naming

- `feature/<name>` for new features
- `fix/<name>` for bug fixes
- `chore/<name>` for maintenance tasks

## Repository Settings (One-Time)

Enable these in GitHub branch protection for `main`:

- Require a pull request before merging
- Require status checks to pass before merging
- Select required check: `CI Build`
- Require at least 1 approval (recommended)
