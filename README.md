## Usage

1. Install Pandoc:

```bash
winget install --source winget --exact --id JohnMacFarlane.Pandoc
```

2. Generate html file using template & input markdown:

```bash
pandoc -f markdown -t html5 -o index.html index.md -c styles.css --template=template.html
```

## TODO

- [ ] Add script to replace all default links with custom ones with icons
- [ ] Automatically create index.html via GitHub Actions
