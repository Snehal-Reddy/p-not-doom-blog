const fs = require('fs');
const path = require('path');
const marked = require('marked');

// Enable GitHub-Flavored Markdown (tables, etc.)
marked.setOptions({
    gfm: true,
});

// Create posts directory if it doesn't exist
const postsDir = './posts';
if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir);
}

// Create pages directory for individual blog posts
const pagesDir = './pages';
if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir);
}

// Function to read and parse markdown files
function parseMarkdownFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Extract frontmatter (metadata at the top of the file)
    const frontmatter = {};
    let bodyStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '---') {
            if (Object.keys(frontmatter).length === 0) {
                // Start of frontmatter
                continue;
            } else {
                // End of frontmatter
                bodyStart = i + 1;
                break;
            }
        } else if (line.includes(':')) {
            const [key, ...valueParts] = line.split(':');
            frontmatter[key.trim()] = valueParts.join(':').trim();
        }
    }
    
    // Extract the body content
    const body = lines.slice(bodyStart).join('\n');
    
    return {
        frontmatter,
        body: marked.parse(body)
    };
}

// Function to generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

// Function to generate HTML template
function generateHTMLTemplate(title, content, isPost = false, frontmatter = {}) {
    const backLink = isPost ? '<a href="../index.html" class="back-link">← Back to Blog</a>' : '';
    
    // Generate SEO meta tags
    const description = frontmatter.summary || 'Technical blog post by Snehal Reddy on systems programming, C/C++, Rust, and performance optimization.';
    const keywords = frontmatter.keywords || 'systems programming, C++, Rust, performance optimization, low-level programming, game server, memory management';
    const author = 'Snehal Reddy';
    const url = isPost ? `https://p-not-doom.com/pages/${generateSlug(title)}.html` : 'https://p-not-doom.com';
    const image = frontmatter.image || 'https://p-not-doom.com/images/snake-battle-royale.png';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="author" content="${author}">
    
    <!-- Open Graph Meta Tags (for social media) -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="${isPost ? 'article' : 'website'}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    
    <!-- Additional SEO -->
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="#5294e2">
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-Z8P2KN04P6"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-Z8P2KN04P6');
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif;
            line-height: 1.6;
            color: #f5f5f7;
            background-image: url('images/back.png');
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            background-repeat: no-repeat;
            margin: 0;
            padding: 2rem;
        }

        .container {
            background-color: #1c1c1e;
            border-radius: 12px;
            padding: 3rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin: 0 auto 2rem auto;
            max-width: 1200px;
        }

        h1, h2, h3 {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            font-weight: 600;
            color: #f5f5f7;
            margin-bottom: 1rem;
        }

        h1 {
            font-size: 3rem;
            color: #f5f5f7;
            text-align: center;
            margin-bottom: 1.5rem;
            font-weight: 700;
        }

        h2 {
            font-size: 2rem;
            color: #f5f5f7;
            border-bottom: 1px solid #38383a;
            padding-bottom: 0.5rem;
            margin-bottom: 2rem;
            font-weight: 600;
        }

        h3 {
            font-size: 1.5rem;
            color: #4a5568;
            margin-bottom: 0.5rem;
        }

        .bio {
            text-align: center;
            font-size: 1.2rem;
            color: #a1a1a6;
            margin-bottom: 3rem;
            line-height: 1.6;
        }

        .blog-post {
            background-color: #2c2c2e;
            border: 1px solid #38383a;
            border-radius: 8px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            transition: all 0.2s ease;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .blog-post:hover {
            background-color: #3a3a3c;
            border-color: #48484a;
            transform: translateY(-2px);
        }

        .post-title {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            font-size: 1.4rem;
            color: #f5f5f7;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }

        .post-summary {
            color: #a1a1a6;
            font-size: 1rem;
            margin-bottom: 1rem;
            line-height: 1.5;
        }

        .post-content {
            color: #f5f5f7;
            line-height: 1.8;
            margin-top: 1.5rem;
        }

        .post-content h1 {
            font-size: 2.5rem;
            text-align: left;
            margin-bottom: 1rem;
        }

        .post-content h2 {
            font-size: 1.8rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }

        .post-content h3 {
            font-size: 1.3rem;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
        }

        .post-content p {
            margin-bottom: 1rem;
        }

        .post-content ul, .post-content ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }

        .post-content li {
            margin-bottom: 0.5rem;
        }

        .post-content code {
            background-color: #2c2c2e;
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
            color: #f5f5f7;
        }

        .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1rem 0;
            display: block;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .post-content pre {
            background-color: #2c2c2e;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
        }

        .post-content pre code {
            background: none;
            padding: 0;
        }

        /* Table styles for markdown content */
        .post-content .table-wrapper {
            width: 100%;
            overflow-x: auto;
        }

        .post-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            background-color: #2c2c2e;
        }

        .post-content th,
        .post-content td {
            border: 1px solid #38383a;
            padding: 0.6rem 0.8rem;
            text-align: left;
            vertical-align: top;
        }

        .post-content thead th {
            background-color: #303034;
            color: #f5f5f7;
            position: sticky;
            top: 0;
        }

        .post-content tbody tr:nth-child(even) {
            background-color: rgba(255, 255, 255, 0.02);
        }

        .post-content blockquote {
            border-left: 3px solid #007aff;
            padding-left: 1rem;
            margin: 1rem 0;
            color: #a1a1a6;
            font-style: italic;
        }

        .post-meta {
            font-size: 0.9rem;
            color: #8e8e93;
            margin-bottom: 1rem;
        }

        .back-link {
            display: inline-block;
            color: #007aff;
            text-decoration: none;
            font-weight: 500;
            margin-bottom: 2rem;
            transition: color 0.2s ease;
        }

        .back-link:hover {
            color: #5ac8fa;
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }

            .container {
                padding: 2rem;
                max-width: 95%;
            }

            h1 {
                font-size: 2.5rem;
            }

            h2 {
                font-size: 1.75rem;
            }

            h2::after {
                display: none;
            }

            .blog-post {
                padding: 1.5rem;
            }

            .post-content h1 {
                font-size: 2rem;
            }

            .post-title::before {
                display: none;
            }
        }

        @media (max-width: 480px) {
            body {
                padding: 0.5rem;
            }

            .container {
                padding: 1.5rem;
                max-width: 98%;
            }

            h1 {
                font-size: 2rem;
            }

            .bio {
                font-size: 1.1rem;
            }

            .post-content h1 {
                font-size: 1.8rem;
            }

            .blog-post {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${backLink}
        ${content}
    </div>
</body>
</html>`;
}

// Function to generate HTML for a blog post summary (for index page)
function generatePostSummaryHTML(post, slug) {
    const { frontmatter } = post;
    
    return `
        <a href="pages/${slug}.html" class="blog-post">
            <div class="post-meta">${frontmatter.date || 'No date'} • ${frontmatter.readTime || '5 min read'}</div>
            <h3 class="post-title">${frontmatter.title || 'Untitled Post'}</h3>
            <div class="post-summary">
                ${frontmatter.summary || 'No summary available.'}
            </div>
        </a>
    `;
}

// Function to generate individual blog post page
function generatePostPage(post, slug) {
    const { frontmatter, body } = post;
    // Wrap tables for horizontal scrolling on small screens
    const bodyWithWrappedTables = body
        .replace(/<table>/g, '<div class="table-wrapper"><table>')
        .replace(/<\/table>/g, '</table></div>');

    const content = `
        <h1>${frontmatter.title || 'Untitled Post'}</h1>
        <div class="post-meta">${frontmatter.date || 'No date'} • ${frontmatter.readTime || '5 min read'}</div>
        <div class="post-content">
            ${bodyWithWrappedTables}
        </div>
    `;
    
    return generateHTMLTemplate(frontmatter.title || 'Blog Post', content, true, frontmatter);
}

// Function to copy static assets
function copyStaticAssets() {
    // Copy images directory if it exists
    const imagesDir = './images';
    const pagesImagesDir = path.join(pagesDir, 'images');
    
    if (fs.existsSync(imagesDir)) {
        if (!fs.existsSync(pagesImagesDir)) {
            fs.mkdirSync(pagesImagesDir, { recursive: true });
        }
        
        const imageFiles = fs.readdirSync(imagesDir);
        imageFiles.forEach(file => {
            const sourcePath = path.join(imagesDir, file);
            const destPath = path.join(pagesImagesDir, file);
            fs.copyFileSync(sourcePath, destPath);
        });
        console.log(`✅ Copied ${imageFiles.length} images to pages/images/`);
        
        // Copy background image to root for index.html
        const backImagePath = path.join(imagesDir, 'back.png');
        if (fs.existsSync(backImagePath)) {
            fs.copyFileSync(backImagePath, './back.png');
            console.log(`✅ Copied back.png to root directory`);
        }
    }
}

// Function to generate sitemap.xml
function generateSitemap(posts) {
    const baseUrl = 'https://p-not-doom.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>`;
    
    // Add blog post URLs
    posts.forEach(post => {
        const postUrl = `${baseUrl}/pages/${post.slug}.html`;
        sitemap += `
    <url>
        <loc>${postUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
    });
    
    sitemap += `
</urlset>`;
    
    return sitemap;
}

// Function to build the complete HTML
function buildHTML() {
    // Get all markdown files from posts directory
    const markdownFiles = fs.readdirSync(postsDir)
        .filter(file => file.endsWith('.md'))
        .sort((a, b) => {
            // Sort by date (newest first)
            const aPath = path.join(postsDir, a);
            const bPath = path.join(postsDir, b);
            const aStats = fs.statSync(aPath);
            const bStats = fs.statSync(bPath);
            return bStats.mtime.getTime() - aStats.mtime.getTime();
        });
    
    // Parse all posts
    const posts = markdownFiles.map(filename => {
        const filePath = path.join(postsDir, filename);
        const post = parseMarkdownFile(filePath);
        const slug = generateSlug(post.frontmatter.title || filename.replace('.md', ''));
        return {
            filename,
            slug,
            ...post
        };
    });
    
    // Generate individual blog post pages
    posts.forEach(post => {
        const postHTML = generatePostPage(post, post.slug);
        fs.writeFileSync(path.join(pagesDir, `${post.slug}.html`), postHTML);
        console.log(`✅ Generated: pages/${post.slug}.html`);
    });
    
    // Copy static assets
    copyStaticAssets();
    
    // Generate main index page
    const indexContent = `
        <h1>Hello, I'm Snehal! 👋</h1>
        <div class="bio">
            Welcome to my corner of the internet 
            <br><br>
            By day, I'm a software engineer who gets paid to write low level systems code that <b>actually works</b> (doesn't generate CVEs hopefully). 
            <br><br>
            But by early mornings and late-nights, I'm simply a hobbyist trying to give my CPU and GPU cores a personality crisis with utterly meaningless projects. This is where I share those early morning and late-night experiments—the projects where I do everything and nothing at the same time.
        </div>
        
        <h2>Latest Projects & Thoughts</h2>
        
        ${posts.map(post => generatePostSummaryHTML(post, post.slug)).join('\n')}
    `;
    
    const indexHTML = generateHTMLTemplate('Snehal Reddy - Systems Programming & Performance Optimization', indexContent);
    fs.writeFileSync('index.html', indexHTML);
    
    // Generate sitemap.xml
    const sitemap = generateSitemap(posts);
    fs.writeFileSync('sitemap.xml', sitemap);
    
    console.log(`✅ Built ${posts.length} blog posts`);
    console.log(`✅ Generated index.html with ${posts.length} post summaries`);
    console.log(`✅ Individual post pages created in pages/ directory`);
    console.log(`✅ Generated sitemap.xml for SEO`);
}

// Run the build
buildHTML();
