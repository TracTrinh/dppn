# Dictionary of Pali Proper Names

Static English-only dictionary app generated from preprocessed DPPN data.

## Local preview

```powershell
python -m http.server 8080
```

Open:

```text
http://127.0.0.1:8080/site/
```

Sample entry:

```text
http://127.0.0.1:8080/site/#/entry/tavatimsa
```

The app expects HTTP/static hosting. Direct `file://` loading is not supported because the app reads JSON and Markdown with `fetch()`.
