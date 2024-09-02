#!/bin/bash
cd ru
pandoc -s -f markdown -t html5 -o index.html index.md -c styles.css --template=../src/template.html

cd ../en
pandoc -s -f markdown -t html5 -o index.html index.md -c styles.css --template=../src/template.html

echo "Files generated"
