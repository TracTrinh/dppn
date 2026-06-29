# DPPN preprocessing data

This published repository stores both built static HTML and regenerated source data.

Regenerate data from the outer workspace:

```powershell
cd D:\Dhamma\books\DPPN
& 'C:\Users\Trac\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\preprocess_epub.py
```

Generated data lives under:

```text
data/entries/<letter>/*.md
data/indexes/*.json
data/source/*.json
```

Extraction v3 starts entries at true visual `p.p14` / `span.t14` headword cues, ignoring empty anchors before the headword, and merges continuation `p14`, `p16`, and list blocks into the same entry. Term classes are documented in the outer `README_PREPROCESSING.md`; see `data/source/extraction-report.json` for validation counts.
