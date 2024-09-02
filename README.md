## Usage

1. Install Pandoc
2. Generate html file using template & input markdown:

```bash
pandoc -s -f markdown -t html5 -o index.html index.md -c styles.css --template=../src/template.html
```

## TODO

- [x] Add script to replace all default links with custom ones with icons
- [x] Add JetBrains Mono font CDN as a source
- [ ] Bash script to generate multiple files at once
