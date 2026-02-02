# GitHub Token for Publishing Releases

To enable automatic publishing of releases, you need to create a GitHub Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Add token as repository secret named `GH_TOKEN` in your GitHub repository settings

Then you can publish updates with:
```bash
npm run publish
```