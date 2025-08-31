# Deployment Guide

## GitHub Pages Deployment

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `my-portfolio-blog`
3. Make it public (required for free GitHub Pages)

### Step 2: Push Your Code

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/my-portfolio-blog.git

# Push to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically run and deploy your site

### Step 4: Access Your Blog

Your blog will be available at:
`https://yourusername.github.io/my-portfolio-blog`

## Adding New Posts

1. Create a new `.md` file in the `posts/` directory
2. Add your content with frontmatter
3. Push to GitHub:
   ```bash
   git add posts/your-new-post.md
   git commit -m "Add new blog post"
   git push
   ```
4. GitHub Actions will automatically build and deploy your updated blog

## Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your repository **Settings** → **Pages**
2. Under **Custom domain**, enter your domain
3. Add a `CNAME` file to your repository with your domain name
4. Update your DNS settings to point to GitHub Pages

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure your Markdown syntax is correct
- Check the GitHub Actions logs for specific errors

### Pages Not Updating
- Wait a few minutes for GitHub Actions to complete
- Check the Actions tab in your repository
- Clear your browser cache

### Local Testing
Before pushing, test locally:
```bash
npm run build
npm run serve
```

Visit `http://localhost:8000` to see your blog.
