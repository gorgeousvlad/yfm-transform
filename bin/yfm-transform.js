'use strict';
const path = require('path');
const fs = require('fs');
const argv = require('yargs').argv;
const glob = require('glob');
const mkdirp = require('mkdirp');
const transform = require('../lib');

const cwd = process.cwd();
let source = argv.source || cwd;
let dest = argv.dest || cwd;
const styles = argv.styles || false;

source = path.resolve(cwd, source);
dest = path.resolve(cwd, dest);

const files = glob.sync('**/*.md', {cwd: source});

const githubMarkdownStyles = fs.readFileSync(require.resolve('github-markdown-css/github-markdown.css'), 'utf8');
const hljsStyles = fs.readFileSync(require.resolve('highlight.js/styles/default.css'), 'utf8');
function styledHtml(html, meta) {
    return `
<!doctype html>
<html>
<head>
    <meta charset="UTF-8"/>
    <title>${meta.title || ''}</title>
    <style>
        ${githubMarkdownStyles}
    </style>
    <style>
        ${hljsStyles}
    </style>
    <style>
        .markdown-body {
            margin: 0 auto;
            min-width: 200px;
            max-width: 980px;
            padding: 45px;
        }
    </style>
</head>
<body class="markdown-body">
    ${html}
</body>
</html>
    `.trim();
}

files.forEach((sourceFile) => {
    const destFile = path.format({
        ...path.parse(sourceFile),
        base: undefined,
        ext: '.html'
    });
    const sourcePath = path.resolve(source, sourceFile);
    const destPath = path.resolve(dest, destFile);
    const sourceFileContent = fs.readFileSync(sourcePath, 'utf8');
    const {html, meta} = transform(sourceFileContent, sourcePath);

    const destFileContent = styles ? styledHtml(html, meta) : html;

    const {dir: fileDestDir} = path.parse(destPath);
    mkdirp.sync(fileDestDir);
    fs.writeFileSync(destPath, destFileContent, 'utf8');
});
