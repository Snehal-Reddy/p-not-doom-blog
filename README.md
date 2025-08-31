# Portfolio & Blog

A responsive portfolio and blog built with HTML and Markdown, featuring low-level systems content and performance optimization insights.

## Features

- Static site generation from Markdown
- Responsive design with dark theme
- Image optimization and lazy loading
- Custom domain support
- Performance-focused architecture

## Development

```bash
# Install dependencies
npm install

# Build the site
npm run build

# Serve locally
npm run serve

# Development mode (build + serve)
npm run dev
```

## Deployment

This site is designed to be deployed to static hosting platforms like GitHub Pages or Netlify.

### GitHub Pages

1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set custom domain to `p-not-doom.com`
4. Add CNAME file with domain

### Netlify

1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.` (root)
4. Add custom domain

## Structure

- `posts/` - Markdown blog posts
- `images/` - Static images
- `pages/` - Generated HTML pages
- `build.js` - Static site generator
- `index.html` - Landing page

## Customization

- Edit `build.js` to modify the site generator
- Update CSS in the `generateHTMLTemplate` function
- Add new posts to `posts/` directory
- Modify bio and metadata in `build.js`
