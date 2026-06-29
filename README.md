# Dictionary of Pali Proper Names

Static English DPPN site for GitHub Pages (`dppn.bhavana.vn`).

This repository contains:

```text
data/                  regenerated EPUB extraction data
<letter>/<headword>/   built static entry pages
assets/                CSS and file-safe search assets
.nojekyll
CNAME
```

Git workflow note:

```text
This Git repository lives at D:\Dhamma\books\DPPN\.publish\dppn.
The outer D:\Dhamma\books\DPPN folder is a build workspace, not the Git repo.
Run git commands from this folder, or use git -C D:\Dhamma\books\DPPN\.publish\dppn ...
```

Build from the outer workspace:

```powershell
cd D:\Dhamma\books\DPPN
& 'C:\Users\Trac\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\preprocess_epub.py
cd site
$env:PATH='C:\Users\Trac\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
& 'C:\Users\Trac\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run build
```

Preview by opening `index.html` directly or by serving this folder with a static server.
